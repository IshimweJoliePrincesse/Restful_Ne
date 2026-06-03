require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, adminMiddleware, errorHandler, notFoundHandler, parseStoredDateTime, applySecurity, registerSwagger, getPagination, paginatedResponse } = require('shared');

const app = express();
const PORT = process.env.EXTINGUISHER_PORT || 3003;

// Service middleware parses JSON and applies shared security controls.
app.use(express.json());
applySecurity(app, cors, helmet, logger, 'extinguisher-service');

// Create validation protects inventory input before database writes.
const inventoryValidation = [
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty'),
  body('serialNumber').optional().trim().notEmpty().withMessage('Serial number cannot be empty'),
  body('location').optional().trim().isLength({ max: 120 }).withMessage('Location must be 120 characters or less'),
  body('userId').optional({ checkFalsy: true }).isUUID().withMessage('Assigned user id must be a valid UUID'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('size').optional().trim().isLength({ max: 30 }).withMessage('Size must be 30 characters or less'),
  body('installationDate').optional().isISO8601().withMessage('Valid installation date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
];

// Update validation mirrors create rules while allowing existing records to change safely.
const updateValidation = [
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty'),
  body('serialNumber').optional().trim().notEmpty().withMessage('Serial number cannot be empty'),
  body('location').optional().trim().isLength({ max: 120 }).withMessage('Location must be 120 characters or less'),
  body('userId').optional({ checkFalsy: true }).isUUID().withMessage('Assigned user id must be a valid UUID'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('size').optional().trim().isLength({ max: 30 }).withMessage('Size must be 30 characters or less'),
  body('installationDate').optional().isISO8601().withMessage('Valid installation date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
];

// Admin route creates extinguisher inventory and optionally assigns it to a user/building owner.
app.post('/extinguishers', authMiddleware, adminMiddleware, inventoryValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { type, expiryDate, location, size, installationDate, userId } = req.body;
    const serialNumber = (req.body.serialNumber || req.body.code || '').trim();
    const code = (req.body.code || serialNumber).trim();
    if (!serialNumber || !code) {
      return res.status(400).json({ success: false, message: 'Code or serial number is required.' });
    }

    if (new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future for inventory items.' });
    }

    const existing = await prisma.fireExtinguisher.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Extinguisher code already exists' });
    }
    const assignedUser = userId
      ? await prisma.user.findFirst({ where: { id: userId, role: 'USER', deletedAt: null } })
      : null;
    if (userId && !assignedUser) {
      return res.status(404).json({ success: false, message: 'Assigned user not found' });
    }

    const extinguisher = await prisma.fireExtinguisher.create({
      data: {
        code,
        serialNumber,
        location,
        type,
        size,
        installationDate: installationDate ? parseStoredDateTime(installationDate) : null,
        expiryDate: parseStoredDateTime(expiryDate),
        status: 'ACTIVE',
        ...(userId && { user: { connect: { id: userId } } }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`Inventory added: ${code}`);
    res.status(201).json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

// List route returns paginated inventory, scoped to assigned records for normal users.
app.get('/extinguishers', authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['expiryDate'], 'expiryDate');
    const search = String(req.query.search || '').trim();
    const andFilters = [];

    if (req.user.role === 'USER') {
      andFilters.push({ userId: req.user.id });
    }

    if (search) {
      andFilters.push({
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = {
      deletedAt: null,
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.type && { type: req.query.type }),
      ...(andFilters.length && { AND: andFilters }),
    };

    const [total, extinguishers] = await Promise.all([
      prisma.fireExtinguisher.count({ where }),
      prisma.fireExtinguisher.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip,
        take,
        orderBy,
      }),
    ]);
    res.json(paginatedResponse(extinguishers, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// Detail route returns one extinguisher while enforcing user ownership visibility.
app.get('/extinguishers/:id', authMiddleware, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const extinguisher = await prisma.fireExtinguisher.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!extinguisher || extinguisher.deletedAt) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    if (req.user.role === 'USER' && extinguisher.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

// Admin route updates extinguisher details and assignment without exposing purchase behavior.
app.put('/extinguishers/:id', authMiddleware, adminMiddleware, [param('id').isUUID(), ...updateValidation], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const existing = await prisma.fireExtinguisher.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    const { type, expiryDate, location, size, installationDate, userId } = req.body;
    const serialNumber = (req.body.serialNumber || req.body.code || existing.serialNumber || existing.code).trim();
    const code = (req.body.code || serialNumber).trim();

    if (new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future.' });
    }
    const assignedUser = userId
      ? await prisma.user.findFirst({ where: { id: userId, role: 'USER', deletedAt: null } })
      : null;
    if (userId && !assignedUser) {
      return res.status(404).json({ success: false, message: 'Assigned user not found' });
    }

    const extinguisher = await prisma.fireExtinguisher.update({
      where: { id: req.params.id },
      data: {
        code,
        serialNumber,
        location,
        type,
        size,
        installationDate: installationDate ? parseStoredDateTime(installationDate) : existing.installationDate,
        expiryDate: parseStoredDateTime(expiryDate),
        ...(Object.prototype.hasOwnProperty.call(req.body, 'userId')
          ? (userId ? { user: { connect: { id: userId } } } : { user: { disconnect: true } })
          : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`Extinguisher updated: ${code}`);
    res.json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

// Admin route soft-deletes an extinguisher to preserve history and reporting integrity.
app.delete('/extinguishers/:id', authMiddleware, adminMiddleware, [param('id').isUUID()], async (req, res, next) => {
  try {
    const existing = await prisma.fireExtinguisher.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    await prisma.fireExtinguisher.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    logger.info(`Extinguisher deleted: ${existing.code}`);
    res.json({ success: true, message: 'Extinguisher deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Health endpoint supports service availability checks.
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'extinguisher-service', status: 'healthy' });
});

// Swagger metadata documents the public contract for the extinguisher service.
registerSwagger(app, {
  title: 'Fire Extinguisher Service API',
  description: 'Inventory CRUD with pagination, search, sorting, filtering, and soft deletion.',
  port: PORT,
  paths: {
    '/extinguishers': {
      get: { tags: ['Extinguishers'], summary: 'List extinguishers with table controls', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated extinguishers' } } },
      post: { tags: ['Extinguishers'], summary: 'Create extinguisher', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/extinguishers/{id}': {
      get: { tags: ['Extinguishers'], summary: 'View extinguisher details', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Details' } } },
      put: { tags: ['Extinguishers'], summary: 'Update extinguisher', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Extinguishers'], summary: 'Soft delete extinguisher', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Deleted' } } },
    },
  },
});

// Shared not-found and error handlers normalize API error responses.
app.use(notFoundHandler);
app.use(errorHandler);

// Service startup binds the configured port and logs readiness.
app.listen(PORT, () => {
  logger.info(`Fire Extinguisher Service running on port ${PORT}`);
});
