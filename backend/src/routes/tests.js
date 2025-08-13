// src/routes/tests.js
const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const testController = require("../controllers/testController");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");

/**
 * @swagger
 * components:
 *   schemas:
 *     TestResult:
 *       type: object
 *       required:
 *         - userId
 *         - testTypeId
 *         - score
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID
 *         userId:
 *           type: integer
 *           description: User ID
 *         testTypeId:
 *           type: integer
 *           description: Test type ID
 *         score:
 *           type: number
 *           description: Test score/result
 *         performanceLevel:
 *           type: string
 *           enum: [excellent, good, average, fair, poor]
 *         rawData:
 *           type: object
 *           description: Raw pose detection data
 */

// Add simplified results endpoint for current user
router.get("/results", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // For now, return empty results
    res.json({
      success: true,
      results: []
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch results' 
    });
  }
});

/**
 * @swagger
 * /api/tests/types:
 *   get:
 *     summary: Get all test types
 *     tags: [Tests]
 *     responses:
 *       200:
 *         description: List of test types
 */
router.get("/types", testController.getTestTypes);

/**
 * @swagger
 * /api/tests/session:
 *   post:
 *     summary: Start a new test session
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Test session created
 */
router.post(
  "/session",
  authenticateToken,
  [body("notes").optional().isString().trim()],
  validateRequest,
  testController.startSession
);

/**
 * @swagger
 * /api/tests/session/{sessionId}/complete:
 *   put:
 *     summary: Complete a test session
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 */
router.put(
  "/session/:sessionId/complete",
  authenticateToken,
  [
    param("sessionId")
      .isInt({ min: 1 })
      .withMessage("Valid session ID required"),
  ],
  validateRequest,
  testController.completeSession
);

/**
 * @swagger
 * /api/tests/result:
 *   post:
 *     summary: Submit test result
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - testTypeId
 *               - score
 *               - userAge
 *               - userGender
 *             properties:
 *               sessionId:
 *                 type: integer
 *               testTypeId:
 *                 type: integer
 *               score:
 *                 type: number
 *               userAge:
 *                 type: integer
 *               userGender:
 *                 type: string
 *               rawData:
 *                 type: object
 */
router.post(
  "/result",
  authenticateToken,
  [
    body("sessionId")
      .isInt({ min: 1 })
      .withMessage("Valid session ID required"),
    body("testTypeId")
      .isInt({ min: 1 })
      .withMessage("Valid test type ID required"),
    body("score").isNumeric().withMessage("Score must be a number"),
    body("userAge")
      .isInt({ min: 65, max: 120 })
      .withMessage("Age must be between 65-120"),
    body("userGender")
      .isIn(["male", "female"])
      .withMessage("Gender must be male or female"),
    body("rawData").optional().isObject(),
  ],
  validateRequest,
  testController.submitResult
);

/**
 * @swagger
 * /api/tests/user/{userId}/results:
 *   get:
 *     summary: Get user's test results
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: testType
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 */
router.get(
  "/user/:userId/results",
  authenticateToken,
  [
    param("userId").isInt({ min: 1 }).withMessage("Valid user ID required"),
    query("testType").optional().isInt({ min: 1 }),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  testController.getUserResults
);

/**
 * @swagger
 * /api/tests/user/{userId}/latest:
 *   get:
 *     summary: Get user's latest test results for all test types
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get(
  "/user/:userId/latest",
  authenticateToken,
  [param("userId").isInt({ min: 1 }).withMessage("Valid user ID required")],
  validateRequest,
  testController.getLatestResults
);

/**
 * @swagger
 * /api/tests/result/{resultId}:
 *   get:
 *     summary: Get specific test result details
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get(
  "/result/:resultId",
  authenticateToken,
  [param("resultId").isInt({ min: 1 }).withMessage("Valid result ID required")],
  validateRequest,
  testController.getResultDetail
);

/**
 * @swagger
 * /api/tests/statistics:
 *   get:
 *     summary: Get overall test statistics
 *     tags: [Tests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female]
 *       - in: query
 *         name: ageGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: testType
 *         schema:
 *           type: integer
 */
router.get(
  "/statistics",
  authenticateToken,
  [
    query("gender").optional().isIn(["male", "female"]),
    query("ageGroup").optional().isString(),
    query("testType").optional().isInt({ min: 1 }),
  ],
  validateRequest,
  testController.getStatistics
);

module.exports = router;
