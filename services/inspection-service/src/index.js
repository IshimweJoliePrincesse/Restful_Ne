require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, roleMiddleware, errorHandler, notFoundHandler, parseStoredDate, applySecurity, registerSwagger } = require('shared');

const app = express();
const PORT = process.env.INSPECTION_PORT || 3004;

app.use(express.json());
applySecurity(app, cors, helmet, logger, 'inspection-service');

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

/**
 * Builds pagination options for inspection tables.
 *
 * Purpose:
 * - Inspection lists can grow quickly, so every list endpoint is server-paginated.
 *
 * Inputs:
 * - page, limit, and sort query parameters.
 *
 * Outputs:
 * - Prisma pagination and sorting options.
 *
 * Business logic:
 * - By default, the oldest scheduled inspection appears first so pending work is visible.
 *
 * Security considerations:
 * - Sort fields are allow-listed to avoid unsafe dynamic query keys.
 */
function getPagination(queryParams, allowedSortFields = ['scheduledDate']) {
  const page = Math.max(parseInt(queryParams.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit || '10', 10), 1), 100);
  const requestedSort = String(queryParams.sort || 'scheduledDate');
  const direction = requestedSort.startsWith('-') ? 'desc' : 'asc';
  const field = requestedSort.replace(/^-/, '');
  const sortField = allowedSortFields.includes(field) ? field : 'scheduledDate';
  return { page, limit, skip: (page - 1) * limit, take: limit, orderBy: { [sortField]: direction } };
}

const scheduleValidation = [
  body('extinguisherId').isUUID().withMessage('Fire extinguisher id must be a valid UUID'),
  body('inspectorId').isUUID().withMessage('Inspector id must be a valid UUID'),
  body('scheduledDate').isISO8601().withMessage('Scheduled date must be a valid date'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be 500 characters or less'),
];

const completeValidation = [
  param('id').isUUID().withMessage('Inspection id must be a valid UUID'),
  body('pressureOk').optional().isBoolean().withMessage('Pressure value must be true or false'),
  body('pinIntact').optional().isBoolean().withMessage('Pin intact value must be true or false'),
  body('labelReadable').optional().isBoolean().withMessage('Label readable value must be true or false'),
  body('issuesFound').optional().trim().isLength({ max: 1000 }).withMessage('Issues found must be 1000 characters or less'),
  body('recommendations').optional().trim().isLength({ max: 1000 }).withMessage('Recommendations must be 1000 characters or less'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'OVERDUE']).withMessage('Invalid inspection status'),
];

app.get('/inspections', authMiddleware, listValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['scheduledDate', 'createdAt', 'status']);
    const search = String(req.query.search || '').trim();
    const where = {
      deletedAt: null,
      ...(req.query.status && { status: req.query.status }),
      ...(req.user.role === 'INSPECTOR' && { inspectorId: req.user.id }),
      ...(req.user.role === 'USER' && { createdById: req.user.id }),
      ...(search && {
        OR: [
          { notes: { contains: search, mode: 'insensitive' } },
          { extinguisher: { serialNumber: { contains: search, mode: 'insensitive' } } },
          { extinguisher: { location: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, inspections] = await Promise.all([
      prisma.inspectionSchedule.count({ where }),
      prisma.inspectionSchedule.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          extinguisher: true,
          inspector: { select: { id: true, name: true, email: true, role: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          result: true,
        },
      }),
    ]);

    res.json({ success: true, data: inspections, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

app.post('/inspections', authMiddleware, roleMiddleware('ADMIN', 'USER'), scheduleValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { extinguisherId, inspectorId, scheduledDate, notes } = req.body;
    const [extinguisher, inspector] = await Promise.all([
      prisma.fireExtinguisher.findFirst({ where: { id: extinguisherId, deletedAt: null } }),
      prisma.user.findFirst({ where: { id: inspectorId, role: 'INSPECTOR', deletedAt: null } }),
    ]);

    if (!extinguisher) return res.status(404).json({ success: false, message: 'Fire extinguisher not found' });
    if (!inspector) return res.status(404).json({ success: false, message: 'Inspector not found' });

    const inspection = await prisma.inspectionSchedule.create({
      data: {
        extinguisherId,
        inspectorId,
        createdById: req.user.id,
        scheduledDate: parseStoredDate(scheduledDate),
        notes,
      },
      include: {
        extinguisher: true,
        inspector: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    logger.info(`Inspection scheduled for extinguisher ${extinguisherId} by ${req.user.id}`);
    res.status(201).json({ success: true, message: 'Inspection scheduled successfully', data: inspection });
  } catch (err) {
    next(err);
  }
});

app.post('/inspections/:id/complete', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), completeValidation, async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const schedule = await prisma.inspectionSchedule.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!schedule) return res.status(404).json({ success: false, message: 'Inspection schedule not found' });
    if (req.user.role === 'INSPECTOR' && schedule.inspectorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Inspectors can only complete assigned inspections' });
    }
    if (schedule.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Inspection is already completed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdResult = await tx.inspectionResult.create({
        data: {
          scheduleId: schedule.id,
          extinguisherId: schedule.extinguisherId,
          completedById: req.user.id,
          pressureOk: req.body.pressureOk ?? true,
          pinIntact: req.body.pinIntact ?? true,
          labelReadable: req.body.labelReadable ?? true,
          issuesFound: req.body.issuesFound,
          recommendations: req.body.recommendations,
        },
      });

      await tx.inspectionSchedule.update({
        where: { id: schedule.id },
        data: { status: 'COMPLETED' },
      });

      return createdResult;
    });

    logger.info(`Inspection completed: ${schedule.id}`);
    res.json({ success: true, message: 'Inspection completed successfully', data: result });
  } catch (err) {
    next(err);
  }
});

app.put('/inspections/:id/status', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), [
  param('id').isUUID().withMessage('Inspection id must be a valid UUID'),
  body('status').isIn(['PENDING', 'COMPLETED', 'OVERDUE']).withMessage('Invalid inspection status'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const inspection = await prisma.inspectionSchedule.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    logger.info(`Inspection status updated: ${req.params.id} -> ${req.body.status}`);
    res.json({ success: true, message: 'Inspection status updated successfully', data: inspection });
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'inspection-service', status: 'healthy' });
});

registerSwagger(app, {
  title: 'Inspection Service API',
  description: 'Schedule, assign, update, complete, and view inspection history.',
  port: PORT,
  paths: {
    '/inspections': {
      get: { tags: ['Inspections'], summary: 'List inspections with pagination/search/sort/filter', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated inspections' } } },
      post: { tags: ['Inspections'], summary: 'Schedule inspection and assign inspector', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Scheduled' } } },
    },
    '/inspections/{id}/complete': {
      post: { tags: ['Inspections'], summary: 'Complete assigned inspection', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Completed' } } },
    },
    '/inspections/{id}/status': {
      put: { tags: ['Inspections'], summary: 'Update inspection status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Status updated' } } },
    },
  },
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Inspection Service running on port ${PORT}`);
});
