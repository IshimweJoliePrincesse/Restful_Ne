require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const { param, validationResult } = require('express-validator');
const { prisma } = require('database');
const { logger, authMiddleware, sendExpiryNotificationEmail, errorHandler, notFoundHandler, getDaysUntilExpiry, isExpiringWithinDays, applySecurity, registerSwagger, getPagination, paginatedResponse } = require('shared');

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3007;
const EXPIRY_WARNING_DAYS = parseInt(process.env.EXPIRY_WARNING_DAYS || '30', 10);
const RESPONSE_DEADLINE_DAYS = parseInt(process.env.RESPONSE_DEADLINE_DAYS || '7', 10);

app.use(express.json());
applySecurity(app, cors, helmet, logger, 'notification-service');

async function checkExpiringExtinguishers() {
  logger.info('Running expiry detection cron job...');

  const extinguishers = await prisma.fireExtinguisher.findMany({
    where: { deletedAt: null },
    include: { user: true },
  });

  const expiringExtinguishers = extinguishers.filter((ext) => isExpiringWithinDays(ext.expiryDate, EXPIRY_WARNING_DAYS));
  const adminRecipients = await prisma.user.findMany({
    where: { role: 'ADMIN', isVerified: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  for (const extinguisher of expiringExtinguishers) {
    const recipient = extinguisher.user || adminRecipients[0];
    if (!recipient) {
      logger.warn(`Expiry notification skipped for ${extinguisher.code}; no assigned user or verified admin recipient found.`);
      continue;
    }

    const existingNotification = await prisma.notification.findFirst({
      where: {
      extinguisherId: extinguisher.id,
        status: { in: ['SENT', 'RESPONDED'] },
        sentAt: { gte: new Date(Date.now() - EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000) },
      },
    });

    if (existingNotification) continue;

    const daysLeft = getDaysUntilExpiry(extinguisher.expiryDate);
    const expiryLabel = daysLeft < 0
      ? `expired ${Math.abs(daysLeft)} day(s) ago`
      : daysLeft === 0
        ? 'expires today'
        : `expires in ${daysLeft} day(s)`;
    const message = `Fire extinguisher ${extinguisher.code} (${extinguisher.type}) ${expiryLabel} on ${new Date(extinguisher.expiryDate).toLocaleDateString()}. Please respond within ${RESPONSE_DEADLINE_DAYS} days.`;

    const notification = await prisma.notification.create({
      data: {
        userId: recipient.id,
        extinguisherId: extinguisher.id,
        message,
        status: 'SENT',
      },
    });

    await sendExpiryNotificationEmail(
      recipient.email,
      recipient.name,
      extinguisher.code,
      extinguisher.expiryDate,
      notification.id
    ).catch((err) => {
      logger.error(`Expiry email failed for ${extinguisher.code}: ${err.message}`);
    });

    logger.info(`Expiry notification sent for extinguisher ${extinguisher.code}`);
  }
}

async function checkIgnoredNotifications() {
  logger.info('Running ignored notification check...');

  const deadline = new Date();
  deadline.setDate(deadline.getDate() - RESPONSE_DEADLINE_DAYS);

  const ignoredNotifications = await prisma.notification.findMany({
    where: {
      status: 'SENT',
      sentAt: { lte: deadline },
    },
    include: {
      user: true,
      extinguisher: true,
    },
  });

  for (const notification of ignoredNotifications) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'IGNORED' },
    });

    logger.warn(
      `Notification ${notification.id} marked as IGNORED for compliance follow-up on extinguisher ${notification.extinguisher?.code}`
    );
  }
}

cron.schedule('0 8 * * *', async () => {
  try {
    await checkExpiringExtinguishers();
    await checkIgnoredNotifications();
  } catch (err) {
    logger.error(`Cron job failed: ${err.message}`);
  }
});

app.get('/notifications', authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, take, orderBy } = getPagination(req.query, ['sentAt', 'status', 'createdAt'], '-sentAt');
    const search = String(req.query.search || '').trim();
    const where = {
      ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }),
      ...(req.query.status && { status: req.query.status }),
      ...(search && { message: { contains: search, mode: 'insensitive' } }),
    };
    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          extinguisher: { select: { id: true, code: true, serialNumber: true, type: true, expiryDate: true } },
        },
        skip,
        take,
        orderBy,
      }),
    ]);
    res.json(paginatedResponse(notifications, total, page, limit));
  } catch (err) {
    next(err);
  }
});

app.post('/notifications/respond/:id', authMiddleware, [param('id').isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (req.user.role !== 'ADMIN' && notification.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (notification.status !== 'SENT') {
      return res.status(400).json({ success: false, message: `Cannot respond to notification with status ${notification.status}` });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: 'RESPONDED', respondedAt: new Date() },
      include: {
        extinguisher: { select: { id: true, code: true, type: true } },
      },
    });

    logger.info(`Notification ${notification.id} responded by user ${req.user.id}`);
    res.json({ success: true, message: 'Response recorded. Escalation stopped.', data: updated });
  } catch (err) {
    next(err);
  }
});

app.post('/notifications/trigger-check', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    await checkExpiringExtinguishers();
    await checkIgnoredNotifications();
    res.json({ success: true, message: 'Expiry and escalation checks completed' });
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'notification-service', status: 'healthy' });
});

registerSwagger(app, {
  title: 'Notification Service API',
  description: 'Expiry alert detection, notification listing, responses, and manual checks.',
  port: PORT,
  paths: {
    '/notifications': { get: { tags: ['Notifications'], summary: 'List notifications with pagination/search/sort/filter', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated notifications' } } } },
    '/notifications/respond/{id}': { post: { tags: ['Notifications'], summary: 'Respond to notification', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Responded' } } } },
    '/notifications/trigger-check': { post: { tags: ['Notifications'], summary: 'Admin manually triggers expiry checks', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Check completed' } } } },
  },
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
  logger.info(`Cron scheduled: daily at 08:00 (expiry warning: ${EXPIRY_WARNING_DAYS} days, response deadline: ${RESPONSE_DEADLINE_DAYS} days)`);
});
