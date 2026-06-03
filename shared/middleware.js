// Error handler logs failures and returns a consistent JSON error body.
function errorHandler(err, req, res, next) {
  const logger = require('./logger');
  logger.error(`${err.message}${err.stack ? `\n${err.stack}` : ''}`);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// Not-found handler returns a consistent response for unmatched routes.
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// Middleware module exports shared fallback handlers for every service.
module.exports = { errorHandler, notFoundHandler };
