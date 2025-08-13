// middleware/auth.js
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Basic authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["passwordHash"] },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid token or inactive user." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Admin-only middleware
const adminOnly = authorize("admin");

// Elderly user or admin middleware
const elderlyOrAdmin = authorize("elderly_user", "admin");

module.exports = {
  authenticate,
  authenticateToken: authenticate, // Alias for compatibility
  authorize,
  adminOnly,
  elderlyOrAdmin,
};
