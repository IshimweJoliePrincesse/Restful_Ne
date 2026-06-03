require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, adminMiddleware, errorHandler, notFoundHandler, parseStoredDate, toDateKey, applySecurity, registerSwagger, getPagination, paginatedResponse } = require('shared');

const app = express();
const PORT = process.env.EXTINGUISHER_PORT || 3003;

app.use(express.json());
applySecurity(app, cors, helmet, logger, 'extinguisher-service');

const inventoryValidation = [
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty'),
  body('serialNumber').optional().trim().notEmpty().withMessage('Serial number cannot be empty'),
  body('location').optional().trim().isLength({ max: 120 }).withMessage('Location must be 120 characters or less'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('size').optional().trim().isLength({ max: 30 }).withMessage('Size must be 30 characters or less'),
  body('installationDate').optional().isISO8601().withMessage('Valid installation date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
];

const updateValidation = [
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty'),
  body('serialNumber').optional().trim().notEmpty().withMessage('Serial number cannot be empty'),
  body('location').optional().trim().isLength({ max: 120 }).withMessage('Location must be 120 characters or less'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('size').optional().trim().isLength({ max: 30 }).withMessage('Size must be 30 characters or less'),
  body('installationDate').optional().isISO8601().withMessage('Valid installation date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
];

app.post('/extinguishers', authMiddleware, adminMiddleware, inventoryValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { type, expiryDate, location, size, installationDate } = req.body;
    const serialNumber = (req.body.serialNumber || req.body.code || '').trim();
    const code = (req.body.code || serialNumber).trim();
    if (!serialNumber || !code) {
      return res.status(400).json({ success: false, message: 'Code or serial number is required.' });
    }

    const todayKey = toDateKey(new Date());
    if (toDateKey(expiryDate) <= todayKey) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future for inventory items.' });
    }

    const existing = await prisma.fireExtinguisher.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Extinguisher code already exists' });
    }

    const extinguisher = await prisma.fireExtinguisher.create({
      data: {
        code,
        serialNumber,
        location,
        type,
        size,
        installationDate: installationDate ? parseStoredDate(installationDate) : null,
        expiryDate: parseStoredDate(expiryDate),
        status: 'ACTIVE',
      },
    });

    logger.info(`Inventory added: ${code}`);
    res.status(201).json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

app.get('/extinguishers', authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['createdAt', 'expiryDate', 'serialNumber', 'location', 'status'], 'expiryDate');
    const search = String(req.query.search || '').trim();
    const where = {
      deletedAt: null,
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.type && { type: req.query.type }),
      ...(search && {
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      }),
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

    if (!extinguisher) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }
    res.json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

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

    const { type, expiryDate, location, size, installationDate } = req.body;
    const serialNumber = (req.body.serialNumber || req.body.code || existing.serialNumber || existing.code).trim();
    const code = (req.body.code || serialNumber).trim();

    if (toDateKey(expiryDate) <= toDateKey(new Date())) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future.' });
    }

    const extinguisher = await prisma.fireExtinguisher.update({
      where: { id: req.params.id },
      data: {
        code,
        serialNumber,
        location,
        type,
        size,
        installationDate: installationDate ? parseStoredDate(installationDate) : existing.installationDate,
        expiryDate: parseStoredDate(expiryDate),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`Extinguisher updated: ${code}`);
    res.json({ success: true, data: extinguisher });
  } catch (err) {
    next(err);
  }
});

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

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'extinguisher-service', status: 'healthy' });
});

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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Fire Extinguisher Service running on port ${PORT}`);
});
