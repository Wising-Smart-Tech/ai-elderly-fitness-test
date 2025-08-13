// services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthService {
  static async login(email, password) {
    try {
      const user = await User.findOne({ 
        where: { email, isActive: true } 
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { passwordHash: _, ...userWithoutPassword } = user.toJSON();

      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      throw error;
    }
  }

  static async register(userData) {
    try {
      const existingUser = await User.findOne({ 
        where: { email: userData.email } 
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const user = await User.create({
        ...userData,
        passwordHash: userData.password,
        role: userData.role || 'elderly_user'
      });

      const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  static async getCurrentUser(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;