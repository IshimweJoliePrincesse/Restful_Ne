const logger = require('./logger');
const { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken, authMiddleware, adminMiddleware, roleMiddleware } = require('./auth');
const { sendEmail, sendOtpEmail, sendPasswordResetOtpEmail, sendInspectorUpgradeEmail, sendExpiryNotificationEmail } = require('./email');
const { errorHandler, notFoundHandler } = require('./middleware');
const { getDaysUntilExpiry, isExpiringWithinDays, startOfDay, parseStoredDate, formatDisplayDate, toDateKey } = require('./dateUtils');
const { applySecurity, configureCors, createRateLimiter, sanitizeRequest, requestLogger, csrfProtection } = require('./security');
const { getPagination, paginatedResponse } = require('./pagination');
const { registerSwagger } = require('./swagger');

module.exports = {
  logger,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  authMiddleware,
  adminMiddleware,
  roleMiddleware,
  sendEmail,
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  sendInspectorUpgradeEmail,
  sendExpiryNotificationEmail,
  errorHandler,
  notFoundHandler,
  getDaysUntilExpiry,
  isExpiringWithinDays,
  startOfDay,
  parseStoredDate,
  formatDisplayDate,
  toDateKey,
  applySecurity,
  configureCors,
  createRateLimiter,
  sanitizeRequest,
  requestLogger,
  csrfProtection,
  getPagination,
  paginatedResponse,
  registerSwagger,
};
