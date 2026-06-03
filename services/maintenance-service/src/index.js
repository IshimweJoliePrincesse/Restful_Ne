require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, roleMiddleware, errorHandler, notFoundHandler, parseStoredDate, applySecurity, registerSwagger } = require('shared');

const app = express();
const PORT = process.env.MAINTENANCE_PORT || 3005;

// Service middleware parses JSON and applies shared security controls.
app.use(express.json());
applySecurity(app, cors, helmet, logger, 'maintenance-service');

// Validation helper returns consistent 400 responses for invalid route inputs.
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

/**
 * Creates safe pagination and sorting options for maintenance history tables.
 *
 * Purpose:
 * - Maintenance records are audit evidence, so the API exposes them in a
 *   predictable paginated format instead of returning unbounded lists.
 *
 * Inputs:
 * - page, limit, and sort query parameters from the frontend data table.
 *
 * Outputs:
 * - Prisma skip/take/orderBy options plus metadata values.
 *
 * Business logic:
 * - Recent maintenance appears first by default because supervisors usually
 *   review the newest safety actions first.
 *
 * Security considerations:
 * - Sorting is allow-listed to avoid unsafe dynamic query construction.
 */
function getPagination(queryParams, allowedSortFields = ['maintenanceDate']) {
  const page = Math.max(parseInt(queryParams.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit || '10', 10), 1), 100);
  const requestedSort = String(queryParams.sort || '-maintenanceDate');
  const direction = requestedSort.startsWith('-') ? 'desc' : 'asc';
  const field = requestedSort.replace(/^-/, '');
  const sortField = allowedSortFields.includes(field) ? field : 'maintenanceDate';
  return { page, limit, skip: (page - 1) * limit, take: limit, orderBy: { [sortField]: direction } };
}

// List validation controls pagination and optional extinguisher filtering.
const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('extinguisherId').optional().isUUID().withMessage('Fire extinguisher id must be a valid UUID'),
];

// Create validation captures the maintenance action, date, issues, notes, and recommendations.
const createValidation = [
  body('extinguisherId').isUUID().withMessage('Fire extinguisher id must be a valid UUID'),
  body('actionTaken').trim().isLength({ min: 3, max: 300 }).withMessage('Action taken must be 3-300 characters'),
  body('maintenanceDate').isISO8601().withMessage('Maintenance date must be a valid date'),
  body('issuesIdentified').optional().trim().isLength({ max: 1000 }).withMessage('Issues identified must be 1000 characters or less'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be 1000 characters or less'),
  body('recommendations').optional().trim().isLength({ max: 1000 }).withMessage('Recommendations must be 1000 characters or less'),
];

// List route returns maintenance history scoped by user role.
app.get('/maintenance', authMiddleware, listValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['maintenanceDate', 'createdAt']);
    const search = String(req.query.search || '').trim();
    const where = {
      deletedAt: null,
      ...(req.query.extinguisherId && { extinguisherId: req.query.extinguisherId }),
      ...(req.user.role === 'INSPECTOR' && { createdById: req.user.id }),
      ...(req.user.role === 'USER' && { extinguisher: { userId: req.user.id } }),
      ...(search && {
        OR: [
          { actionTaken: { contains: search, mode: 'insensitive' } },
          { issuesIdentified: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, logs] = await Promise.all([
      prisma.maintenanceLog.count({ where }),
      prisma.maintenanceLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          extinguisher: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    res.json({ success: true, data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// Create route lets admins and inspectors log maintenance evidence.
app.post('/maintenance', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), createValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const extinguisher = await prisma.fireExtinguisher.findFirst({
      where: { id: req.body.extinguisherId, deletedAt: null },
    });
    if (!extinguisher) {
      return res.status(404).json({ success: false, message: 'Fire extinguisher not found' });
    }

    const log = await prisma.maintenanceLog.create({
      data: {
        extinguisherId: req.body.extinguisherId,
        createdById: req.user.id,
        actionTaken: req.body.actionTaken,
        maintenanceDate: parseStoredDate(req.body.maintenanceDate),
        issuesIdentified: req.body.issuesIdentified,
        notes: req.body.notes,
        recommendations: req.body.recommendations,
      },
      include: {
        extinguisher: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    logger.info(`Maintenance logged for extinguisher ${req.body.extinguisherId} by ${req.user.id}`);
    res.status(201).json({ success: true, message: 'Maintenance logged successfully', data: log });
  } catch (err) {
    next(err);
  }
});

// Detail route returns one maintenance log while enforcing user ownership visibility.
app.get('/maintenance/:id', authMiddleware, [param('id').isUUID()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const log = await prisma.maintenanceLog.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        extinguisher: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    if (req.user.role === 'USER' && log.extinguisher.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

// Admin route soft-deletes maintenance records while preserving audit history.
app.delete('/maintenance/:id', authMiddleware, roleMiddleware('ADMIN'), [param('id').isUUID()], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const existing = await prisma.maintenanceLog.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return res.status(404).json({ success: false, message: 'Maintenance log not found' });

    await prisma.maintenanceLog.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    logger.info(`Maintenance log soft deleted: ${req.params.id}`);
    res.json({ success: true, message: 'Maintenance log deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Health endpoint supports service availability checks.
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'maintenance-service', status: 'healthy' });
});

// Swagger metadata documents the public contract for maintenance workflows.
registerSwagger(app, {
  title: 'Maintenance Service API',
  description: 'Create, list, view, and soft-delete maintenance logs.',
  port: PORT,
  paths: {
    '/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List maintenance logs with pagination/search/sort/filter', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated maintenance logs' } } },
      post: { tags: ['Maintenance'], summary: 'Create maintenance log', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Maintenance logged' } } },
    },
    '/maintenance/{id}': {
      get: { tags: ['Maintenance'], summary: 'View maintenance log', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Maintenance detail' } } },
      delete: { tags: ['Maintenance'], summary: 'Soft delete maintenance log', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Deleted' } } },
    },
  },
});

// Shared not-found and error handlers normalize API error responses.
app.use(notFoundHandler);
app.use(errorHandler);

// Service startup binds the configured port and logs readiness.
app.listen(PORT, () => {
  logger.info(`Maintenance Service running on port ${PORT}`);
});
