// routes/admin.js
const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../models");
const { authenticate, adminOnly } = require("../middleware/auth");
const { body, validationResult, query } = require("express-validator");

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(adminOnly);

// POST /api/admin/users - Create elderly user
router.post(
  "/users",
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("name").trim().isLength({ min: 1 }),
    body("birthday").isISO8601().toDate(),
    body("height").isFloat({ min: 50, max: 250 }),
    body("weight").isFloat({ min: 20, max: 300 }),
    body("gender").isIn(["male", "female"]),
    body("phone")
      .optional()
      .matches(/^[\+]?[\d\s\-\(\)]{10,}$/),
    body("password").optional().isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email,
        name,
        birthday,
        height,
        weight,
        gender,
        phone,
        password,
      } = req.body;

      // Check if user already exists (only if email is provided)
      if (email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res
            .status(400)
            .json({ error: "User with this email already exists" });
        }
      }

      const user = await User.create({
        email,
        name,
        birthday,
        height,
        weight,
        gender,
        phone,
        passwordHash: password,
        role: "elderly_user",
        createdBy: req.user.id,
      });

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/admin/users - List all elderly users
router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().trim(),
    query("role").optional().isIn(["admin", "elderly_user"]),
    query("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page = 1, limit = 10, search, role, isActive } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (search) {
        const { Op } = require("sequelize");
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive === "true";

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ["passwordHash"] },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      res.json({
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PUT /api/admin/users/:id - Update user profile
router.put(
  "/users/:id",
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("name").optional().trim().isLength({ min: 1 }),
    body("birthday").optional().isISO8601().toDate(),
    body("height").optional().isFloat({ min: 50, max: 250 }),
    body("weight").optional().isFloat({ min: 20, max: 300 }),
    body("gender").optional().isIn(["male", "female"]),
    body("phone")
      .optional()
      .matches(/^[\+]?[\d\s\-\(\)]{10,}$/),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.password;
      delete updateData.role;
      delete updateData.createdBy;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if email is being changed and is unique
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          where: { email: updateData.email },
        });
        if (existingUser) {
          return res.status(400).json({
            error: "User with this email already exists",
          });
        }
      }

      await user.update(updateData);

      const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
      res.json({
        message: "User updated successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/admin/users/:id - Deactivate user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: "Cannot deactivate your own account",
      });
    }

    await user.update({ isActive: false });

    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
