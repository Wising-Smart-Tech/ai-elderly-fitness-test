// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    
    res.json(result);
  } catch (error) {
    res.status(401).json({ 
      message: error.message || 'Invalid credentials',
      error: error.message || 'Invalid credentials'
    });
  }
});

// POST /api/auth/register
router.post('/register', [
  body('email').optional().isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 1 }),
  body('birthday').isISO8601().toDate(),
  body('height').isFloat({ min: 50, max: 250 }),
  body('weight').isFloat({ min: 20, max: 300 }),
  body('gender').isIn(['male', 'female']),
  body('phone').optional().matches(/^[\+]?[\d\s\-\(\)]{10,}$/),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await AuthService.register(req.body);
    res.status(201).json({ 
      message: 'Registration successful',
      user 
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message || 'Registration failed',
      error: error.message || 'Registration failed'
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await AuthService.getCurrentUser(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch user data',
      error: 'Failed to fetch user data'
    });
  }
});

module.exports = router;