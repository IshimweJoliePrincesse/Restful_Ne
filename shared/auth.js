const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`;

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.token;
  if ((!authHeader || !authHeader.startsWith('Bearer ')) && !queryToken) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const token = queryToken || authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

/**
 * Creates reusable role-based access control middleware.
 *
 * Purpose:
 * - Keeps authorization checks consistent across all microservices.
 *
 * Inputs:
 * - allowedRoles: role names that may access a protected route.
 * - req.user: decoded JWT payload populated by authMiddleware.
 *
 * Outputs:
 * - Calls next() when the user has an allowed role.
 * - Returns 403 when the user is authenticated but not authorized.
 *
 * Business logic:
 * - ADMIN, INSPECTOR, and USER are the project roles. Routes pass the exact
 *   roles that match the business action being protected.
 *
 * Security considerations:
 * - This middleware must always run after authMiddleware, because it trusts
 *   req.user only after the JWT signature has been verified.
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  authMiddleware,
  adminMiddleware,
  roleMiddleware,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};
