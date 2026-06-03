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

// Request sanitizer applies value sanitization to body, query, and route params.
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

// Request logger records method, URL, status, and response duration.
function requestLogger(logger, serviceName) {
  return (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info(`${serviceName} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  };
}

// CSRF token handler issues a readable token cookie for the frontend client.
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

// CSRF protection rejects unsafe requests with mismatched CSRF tokens.
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

// CORS configuration limits browser access to approved frontend origins.
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

// Rate limiter protects services from noisy or abusive request bursts.
function createRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });
}

// Security applicator installs the common production middleware stack.
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

// Security module exports middleware builders used by every service.
module.exports = {
  applySecurity,
  configureCors,
  createRateLimiter,
  sanitizeRequest,
  requestLogger,
  csrfProtection,
};
