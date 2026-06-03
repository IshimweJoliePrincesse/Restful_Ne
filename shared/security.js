const crypto = require('crypto');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

/**
 * Sanitizes request data to reduce script and operator injection risk.
 *
 * Purpose:
 * - Removes common XSS payload characters and Mongo-style operator keys from
 *   request bodies, query strings, and URL parameters before controllers use them.
 *
 * Inputs:
 * - Any JSON-compatible value from req.body, req.query, or req.params.
 *
 * Outputs:
 * - A sanitized clone of the same value.
 *
 * Business logic:
 * - The application uses Prisma/PostgreSQL, so SQL injection is already reduced
 *   by parameterized ORM queries. This extra layer protects logs, UI rendering,
 *   and accidental dynamic query use.
 *
 * Security considerations:
 * - Sanitization is not a replacement for validation. Each route must still use
 *   express-validator or equivalent schema checks for allowed fields and enums.
 */
function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
    );
  }
  if (typeof value !== 'string') return value;
  return value.replace(/[<>]/g, '').replace(/javascript:/gi, '').trim();
}

function sanitizeRequest(req, _res, next) {
  req.body = sanitizeValue(req.body);
  const sanitizedQuery = sanitizeValue(req.query);
  const sanitizedParams = sanitizeValue(req.params);
  Object.keys(req.query || {}).forEach((key) => delete req.query[key]);
  Object.assign(req.query, sanitizedQuery);
  Object.keys(req.params || {}).forEach((key) => delete req.params[key]);
  Object.assign(req.params, sanitizedParams);
  next();
}

function requestLogger(logger, serviceName) {
  return (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info(`${serviceName} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  };
}

function csrfTokenHandler(req, res, next) {
  let csrfToken = req.cookies?.csrfToken;
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  res.setHeader('X-CSRF-Token', csrfToken);
  next();
}

function csrfProtection(req, res, next) {
  const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!unsafeMethods.includes(req.method)) return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (cookieToken && headerToken && cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }
  next();
}

function configureCors() {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}

function createRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });
}

function applySecurity(app, corsMiddleware, helmetMiddleware, logger, serviceName) {
  app.use(helmetMiddleware());
  app.use(corsMiddleware(configureCors()));
  app.use(compression());
  app.use(cookieParser());
  app.use(createRateLimiter());
  app.use(csrfTokenHandler);
  app.use(csrfProtection);
  app.use(sanitizeRequest);
  if (logger) app.use(requestLogger(logger, serviceName));
}

module.exports = {
  applySecurity,
  configureCors,
  createRateLimiter,
  sanitizeRequest,
  requestLogger,
  csrfProtection,
};
