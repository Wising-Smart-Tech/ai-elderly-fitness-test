const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT id, name, email, phone, gender, birthday, height, weight, created_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/:id', 
  authenticateToken,
  [
    body('name').optional().isString().trim().isLength({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim(),
    body('height').optional().isInt({ min: 50, max: 250 }),
    body('weight').optional().isInt({ min: 20, max: 300 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = parseInt(req.params.id);
      const requestUserId = req.user.id;
      
      // Check if user is updating their own profile
      if (userId !== requestUserId) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }
      
      const { name, email, phone, height, weight } = req.body;
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }
      
      if (email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }
      
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount}`);
        values.push(phone);
        paramCount++;
      }
      
      if (height !== undefined) {
        updates.push(`height = $${paramCount}`);
        values.push(height);
        paramCount++;
      }
      
      if (weight !== undefined) {
        updates.push(`weight = $${paramCount}`);
        values.push(weight);
        paramCount++;
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      // Add user ID as the last parameter
      values.push(userId);
      
      const query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, name, email, phone, gender, birthday, height, weight, created_at, updated_at
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // If height or weight was updated, calculate and update BMI
      if (height !== undefined || weight !== undefined) {
        const user = result.rows[0];
        if (user.height && user.weight) {
          const bmi = (user.weight / Math.pow(user.height / 100, 2)).toFixed(2);
          
          // Update or insert into user_health_metrics
          const metricsQuery = `
            INSERT INTO user_health_metrics (user_id, bmi)
            VALUES ($1, $2)
            ON CONFLICT (user_id) 
            DO UPDATE SET bmi = $2
          `;
          
          await pool.query(metricsQuery, [userId, bmi]);
        }
      }
      
      res.json({ 
        message: 'Profile updated successfully',
        user: result.rows[0] 
      });
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }
);

// Get user's health metrics
router.get('/:id/health-metrics', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const requestUserId = req.user.id;
    
    // Check if user is accessing their own metrics
    if (userId !== requestUserId) {
      return res.status(403).json({ error: 'You can only access your own health metrics' });
    }
    
    const query = `
      SELECT uhm.*, u.height, u.weight, u.birthday
      FROM user_health_metrics uhm
      JOIN users u ON u.id = uhm.user_id
      WHERE uhm.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        metrics: null,
        message: 'No health metrics found. Complete fitness tests to generate metrics.' 
      });
    }
    
    res.json({ metrics: result.rows[0] });
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

module.exports = router;