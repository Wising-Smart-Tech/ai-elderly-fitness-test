// src/controllers/testController.js
const testService = require("../services/testService");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

class TestController {
  async getTestTypes(req, res, next) {
    try {
      const testTypes = await testService.getAllTestTypes();
      res.json({
        success: true,
        data: testTypes,
      });
    } catch (error) {
      next(error);
    }
  }

  async startSession(req, res, next) {
    try {
      const { notes } = req.body;
      const userId = req.user.id;

      const session = await testService.createSession(userId, notes);

      logger.info(`Test session started for user ${userId}`, {
        sessionId: session.id,
      });

      res.status(201).json({
        success: true,
        sessionId: session.id,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const session = await testService.completeSession(sessionId, userId);

      logger.info(`Test session completed`, { sessionId, userId });

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitResult(req, res, next) {
    try {
      const { sessionId, testTypeId, score, userAge, userGender, rawData } =
        req.body;
      const userId = req.user.id;

      // Calculate performance level based on score, age, and gender
      const performanceLevel = await testService.calculatePerformanceLevel(
        testTypeId,
        score,
        userAge,
        userGender
      );

      const result = await testService.saveTestResult({
        sessionId,
        userId,
        testTypeId,
        score,
        performanceLevel,
        ageGroup: testService.getAgeGroup(userAge),
        rawData,
      });

      // Generate recommendations based on the result
      const recommendations = await testService.generateRecommendations(result);

      logger.info(`Test result submitted`, {
        userId,
        testTypeId,
        score,
        performanceLevel,
      });

      res.status(201).json({
        success: true,
        data: {
          result,
          recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserResults(req, res, next) {
    try {
      const { userId } = req.params;
      const { testType, limit = 10, offset = 0 } = req.query;

      // Check if user can access these results
      if (userId != req.user.id && req.user.role !== "admin") {
        throw new AppError("Unauthorized access to user results", 403);
      }

      const results = await testService.getUserResults(userId, {
        testType,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLatestResults(req, res, next) {
    try {
      const { userId } = req.params;

      if (userId != req.user.id && req.user.role !== "admin") {
        throw new AppError("Unauthorized access to user results", 403);
      }

      const results = await testService.getLatestResults(userId);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async getResultDetail(req, res, next) {
    try {
      const { resultId } = req.params;

      const result = await testService.getResultDetail(resultId);

      // Check if user can access this result
      if (result.user_id != req.user.id && req.user.role !== "admin") {
        throw new AppError("Unauthorized access to test result", 403);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const { gender, ageGroup, testType } = req.query;

      const statistics = await testService.getStatistics({
        gender,
        ageGroup,
        testType,
      });

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
