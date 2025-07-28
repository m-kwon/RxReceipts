// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rxreceipts-secret-key-change-in-production';

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      details: 'Please log in to access your receipt data',
      action: 'redirect_to_login'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Session expired',
          details: 'Your session has expired. Please log in again.',
          action: 'redirect_to_login'
        });
      }

      return res.status(403).json({
        error: 'Invalid token',
        details: 'Your session is invalid. Please log in again.',
        action: 'redirect_to_login'
      });
    }

    req.user = user;
    next();
  });
}

// Optional authentication - doesn't fail if no token
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth
};