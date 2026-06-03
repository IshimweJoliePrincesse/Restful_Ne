require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const PDFDocument = require('pdfkit');
const { query, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, roleMiddleware, errorHandler, notFoundHandler, applySecurity, registerSwagger } = require('shared');

const app = express();
const PORT = process.env.REPORTING_PORT || 3006;

app.use(express.json());
applySecurity(app, cors, helmet, logger, 'reporting-service');

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

/**
 * Converts report rows into a CSV document.
 *
 * Purpose:
 * - Gives users a simple export format for inventory, compliance, inspection,
 *   and maintenance reports.
 *
 * Inputs:
 * - rows: plain objects with report data.
 *
 * Outputs:
 * - A text/csv string suitable for browser download.
 *
 * Business logic:
 * - CSV export is intentionally generated from structured objects instead of
 *   string-concatenating arbitrary request data.
 *
 * Security considerations:
 * - Values beginning with spreadsheet formula characters are prefixed with an
 *   apostrophe to reduce CSV formula injection risk.
 */
function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeValue = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(','))].join('\n');
}

async function saveReport(type, title, payload, userId) {
  return prisma.report.create({
    data: { type, title, payload, generatedById: userId },
  });
}

app.get('/reports', authMiddleware, roleMiddleware('ADMIN'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['INVENTORY', 'INSPECTION', 'COMPLIANCE', 'MAINTENANCE']).withMessage('Invalid report type'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const where = req.query.type ? { type: req.query.type } : {};
    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { generatedBy: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    res.json({ success: true, data: reports, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

app.get('/reports/inventory', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [total, byStatus, daily, monthly, yearly] = await Promise.all([
      prisma.fireExtinguisher.count({ where: { deletedAt: null } }),
      prisma.fireExtinguisher.groupBy({ by: ['status'], _count: { status: true }, where: { deletedAt: null } }),
      prisma.fireExtinguisher.count({ where: { deletedAt: null, createdAt: { gte: dayStart } } }),
      prisma.fireExtinguisher.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
      prisma.fireExtinguisher.count({ where: { deletedAt: null, createdAt: { gte: yearStart } } }),
    ]);

    const payload = { totalExtinguishers: total, byStatus, dailySummary: daily, monthlySummary: monthly, yearlySummary: yearly };
    await saveReport('INVENTORY', 'Inventory Report', payload, req.user.id);
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

app.get('/reports/inspection', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    const [pending, completed, overdue] = await Promise.all([
      prisma.inspectionSchedule.count({ where: { deletedAt: null, status: 'PENDING' } }),
      prisma.inspectionSchedule.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      prisma.inspectionSchedule.count({ where: { deletedAt: null, status: 'OVERDUE' } }),
    ]);

    const payload = { pending, completed, overdue };
    await saveReport('INSPECTION', 'Inspection Report', payload, req.user.id);
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

app.get('/reports/compliance', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const [expired, nearExpiry, compliant] = await Promise.all([
      prisma.fireExtinguisher.count({ where: { deletedAt: null, expiryDate: { lt: now } } }),
      prisma.fireExtinguisher.count({ where: { deletedAt: null, expiryDate: { gte: now, lte: soon } } }),
      prisma.fireExtinguisher.count({ where: { deletedAt: null, expiryDate: { gt: soon } } }),
    ]);

    const payload = { expired, nearExpiry, compliant };
    await saveReport('COMPLIANCE', 'Compliance Report', payload, req.user.id);
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

app.get('/reports/maintenance', authMiddleware, roleMiddleware('ADMIN', 'INSPECTOR'), async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [historyCount, recentActivities, frequency] = await Promise.all([
      prisma.maintenanceLog.count({ where: { deletedAt: null } }),
      prisma.maintenanceLog.findMany({
        where: { deletedAt: null, maintenanceDate: { gte: thirtyDaysAgo } },
        take: 10,
        orderBy: { maintenanceDate: 'desc' },
        include: { extinguisher: true, createdBy: { select: { id: true, name: true, email: true } } },
      }),
      prisma.maintenanceLog.groupBy({
        by: ['extinguisherId'],
        _count: { extinguisherId: true },
        where: { deletedAt: null },
        orderBy: { _count: { extinguisherId: 'desc' } },
        take: 10,
      }),
    ]);

    const payload = { historyCount, recentActivities, frequency };
    await saveReport('MAINTENANCE', 'Maintenance Report', payload, req.user.id);
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

app.get('/reports/export.csv', authMiddleware, roleMiddleware('ADMIN'), [
  query('type').isIn(['INVENTORY', 'INSPECTION', 'COMPLIANCE', 'MAINTENANCE']).withMessage('Invalid report type'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const reports = await prisma.report.findMany({
      where: { type: req.query.type },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const rows = reports.map((report) => ({
      id: report.id,
      type: report.type,
      title: report.title,
      createdAt: report.createdAt.toISOString(),
      payload: JSON.stringify(report.payload),
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.query.type.toLowerCase()}-reports.csv"`);
    res.send(toCsv(rows));
  } catch (err) {
    next(err);
  }
});

app.get('/reports/export.pdf', authMiddleware, roleMiddleware('ADMIN'), [
  query('type').isIn(['INVENTORY', 'INSPECTION', 'COMPLIANCE', 'MAINTENANCE']).withMessage('Invalid report type'),
], async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const reports = await prisma.report.findMany({
      where: { type: req.query.type },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.query.type.toLowerCase()}-reports.pdf"`);
    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);
    doc.fontSize(18).text(`${req.query.type} Reports`, { underline: true });
    doc.moveDown();
    reports.forEach((report, index) => {
      doc.fontSize(12).text(`${index + 1}. ${report.title}`);
      doc.fontSize(10).text(`ID: ${report.id}`);
      doc.text(`Created: ${report.createdAt.toISOString()}`);
      doc.text(`Payload: ${JSON.stringify(report.payload)}`, { width: 500 });
      doc.moveDown();
    });
    doc.end();
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'reporting-service', status: 'healthy' });
});

registerSwagger(app, {
  title: 'Reporting Service API',
  description: 'Inventory, inspection, compliance, maintenance, CSV export, and printable PDF export APIs.',
  port: PORT,
  paths: {
    '/reports': { get: { tags: ['Reports'], summary: 'List generated reports', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated reports' } } } },
    '/reports/inventory': { get: { tags: ['Reports'], summary: 'Generate inventory report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Inventory report' } } } },
    '/reports/inspection': { get: { tags: ['Reports'], summary: 'Generate inspection report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Inspection report' } } } },
    '/reports/compliance': { get: { tags: ['Reports'], summary: 'Generate compliance report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Compliance report' } } } },
    '/reports/maintenance': { get: { tags: ['Reports'], summary: 'Generate maintenance report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Maintenance report' } } } },
    '/reports/export.csv': { get: { tags: ['Reports'], summary: 'Export reports as CSV', security: [{ bearerAuth: [] }], responses: { 200: { description: 'CSV download' } } } },
    '/reports/export.pdf': { get: { tags: ['Reports'], summary: 'Export reports as printable PDF file', security: [{ bearerAuth: [] }], responses: { 200: { description: 'PDF download' } } } },
  },
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Reporting Service running on port ${PORT}`);
});
