require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, roleMiddleware, errorHandler, notFoundHandler, applySecurity, registerSwagger, sendInspectorUpgradeEmail } = require('shared');

const app = express();
const PORT = process.env.USER_PORT || 3002;
const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  role: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

app.use(express.json());
applySecurity(app, cors, helmet, logger, 'user-service');

/**
 * Converts common table query parameters into Prisma pagination options.
 *
 * Purpose:
 * - Every table in the system must support pagination, search, sorting, and filtering.
 *
 * Inputs:
 * - page: requested page number, defaulting to 1.
 * - limit: number of records per page, capped to protect the database.
 * - sort: a field name, optionally prefixed with "-" for descending order.
 *
 * Outputs:
 * - skip, take, orderBy, page, and limit values used by Prisma queries.
 *
 * Business logic:
 * - The API returns predictable pagination metadata so the React data tables can
 *   render server-side paging controls.
 *
 * Security considerations:
 * - Sort fields are allow-listed to prevent users from passing arbitrary Prisma keys.
 */
function getPagination(queryParams, allowedSortFields = ['createdAt']) {
  const page = Math.max(parseInt(queryParams.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit || '10', 10), 1), 100);
  const requestedSort = String(queryParams.sort || '-createdAt');
  const direction = requestedSort.startsWith('-') ? 'desc' : 'asc';
  const field = requestedSort.replace(/^-/, '');
  const sortField = allowedSortFields.includes(field) ? field : 'createdAt';

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortField]: direction },
  };
}

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['ADMIN', 'INSPECTOR', 'USER']).withMessage('Role must be ADMIN, INSPECTOR, or USER'),
];

const createValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  body('role').isIn(['ADMIN', 'INSPECTOR', 'USER']).withMessage('Role must be ADMIN, INSPECTOR, or USER'),
];

const updateValidation = [
  param('id').isUUID().withMessage('User id must be a valid UUID'),
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('role').optional().isIn(['ADMIN', 'INSPECTOR', 'USER']).withMessage('Role must be ADMIN, INSPECTOR, or USER'),
];

app.get('/users', authMiddleware, roleMiddleware('ADMIN'), listValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['createdAt', 'name', 'email', 'role']);
    const search = String(req.query.search || '').trim();
    const where = {
      deletedAt: null,
      ...(req.query.role && { role: req.query.role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select: USER_SELECT, skip, take, orderBy }),
    ]);

    res.json({ success: true, data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

app.post('/users', authMiddleware, roleMiddleware('ADMIN'), createValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { firstName, lastName, email, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role,
        isVerified: true,
      },
      select: USER_SELECT,
    });

    logger.info(`User created by admin ${req.user.id}: ${email}`);
    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (err) {
    next(err);
  }
});

app.get('/users/:id', authMiddleware, [param('id').isUUID()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: USER_SELECT });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

app.put('/users/:id', authMiddleware, updateValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.body.role && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admins can change roles' });
    }

    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    const firstName = req.body.firstName ?? existing.firstName;
    const lastName = req.body.lastName ?? existing.lastName;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(' ').trim() || existing.name,
        ...(req.body.role && { role: req.body.role }),
      },
      select: USER_SELECT,
    });

    if (req.body.role === 'INSPECTOR' && existing.role !== 'INSPECTOR') {
      sendInspectorUpgradeEmail(user.email, user.name).catch((err) => {
        logger.error(`Inspector upgrade email failed for ${user.email}: ${err.message}`);
      });
      logger.info(`Inspector upgrade email queued for: ${user.email}`);
    }

    logger.info(`User updated: ${req.params.id}`);
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (err) {
    next(err);
  }
});

app.delete('/users/:id', authMiddleware, roleMiddleware('ADMIN'), [param('id').isUUID()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;
    if (req.user.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'Admins cannot delete their own account' });
    }

    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    logger.info(`User soft deleted: ${req.params.id}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'user-service', status: 'healthy' });
});

registerSwagger(app, {
  title: 'User Management Service API',
  description: 'User listing, viewing, creation, role upgrade, profile update, and soft deletion APIs.',
  port: PORT,
  paths: {
    '/users': {
      get: { tags: ['Users'], summary: 'List users with pagination, search, sorting, and role filtering', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated users' } } },
      post: { tags: ['Users'], summary: 'Admin creates a verified user', security: [{ bearerAuth: [] }], responses: { 201: { description: 'User created' } } },
    },
    '/users/{id}': {
      get: { tags: ['Users'], summary: 'View one user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'User details' } } },
      put: { tags: ['Users'], summary: 'Update user profile or admin-upgrade role to INSPECTOR', security: [{ bearerAuth: [] }], responses: { 200: { description: 'User updated' } } },
      delete: { tags: ['Users'], summary: 'Soft delete user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'User deleted' } } },
    },
  },
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`User Service running on port ${PORT}`);
});
