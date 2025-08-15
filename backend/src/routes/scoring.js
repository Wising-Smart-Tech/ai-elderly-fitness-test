const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Import the metric scoring tables
const METRIC_SCORING_TABLES = require('../../migrations/metric_scoring_tables').METRIC_SCORING_TABLES;

// Map frontend test IDs to backend scoring table keys
const TEST_ID_MAPPING = {
  1: 'chair_stand',
  2: 'arm_curl',
  3: 'back_scratch',  // Frontend Test 3 = Back Scratch
  4: 'sit_reach',     // Frontend Test 4 = Sit and Reach
  5: '8ft_up_go',
  6: 'step_in_place'
};

/**
 * Get meter thresholds for a specific test
 * Returns the minimum values for fair, average, good, and excellent levels
 * These are used to draw the meter with dividers at the correct positions
 */
router.get('/meter-thresholds/:testId', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const { gender, ageGroup } = req.query;

    // Validate inputs
    if (!gender || !ageGroup) {
      return res.status(400).json({ 
        error: 'Missing required parameters: gender and ageGroup' 
      });
    }

    const testKey = TEST_ID_MAPPING[testId];
    if (!testKey) {
      return res.status(400).json({ 
        error: 'Invalid test ID' 
      });
    }

    // Get scoring data for this test, gender, and age group
    const scoringData = METRIC_SCORING_TABLES[testKey]?.[gender]?.[ageGroup];
    
    if (!scoringData) {
      return res.status(404).json({ 
        error: 'No scoring data found for specified parameters' 
      });
    }

    // Determine if this is a "lower is better" test
    const isLowerBetter = testId === '5' || testId === 5;

    let thresholds;
    if (!isLowerBetter) {
      // For tests where higher is better (most tests)
      thresholds = {
        fairMin: scoringData.fair[0],       // Minimum score for fair level
        averageMin: scoringData.average[0], // Minimum score for average level
        goodMin: scoringData.good[0],       // Minimum score for good level
        excellentMin: scoringData.excellent[0], // Minimum score for excellent level
        
        // Additional data for complete meter drawing
        poorMax: scoringData.poor[1],       // Maximum of poor range (for min value)
        excellentMax: scoringData.excellent[1], // Maximum of excellent range (for max value)
        
        // Performance ranges for reference
        ranges: {
          poor: scoringData.poor,
          fair: scoringData.fair,
          average: scoringData.average,
          good: scoringData.good,
          excellent: scoringData.excellent
        },
        
        isLowerBetter: false
      };
    } else {
      // For Test 5 (8-foot Up and Go) where lower is better
      thresholds = {
        // Note: Order is reversed for display
        fairMin: scoringData.fair[1],       // Maximum of fair (worse threshold)
        averageMin: scoringData.average[1], // Maximum of average
        goodMin: scoringData.good[1],       // Maximum of good
        excellentMin: scoringData.excellent[1], // Maximum of excellent (best threshold)
        
        // Additional data
        poorMin: scoringData.poor[0],       // Minimum of poor (worst scores)
        excellentMax: scoringData.excellent[0], // Minimum of excellent (best scores)
        
        // Performance ranges for reference
        ranges: {
          poor: scoringData.poor,
          fair: scoringData.fair,
          average: scoringData.average,
          good: scoringData.good,
          excellent: scoringData.excellent
        },
        
        isLowerBetter: true
      };
    }

    // Add metadata
    thresholds.testId = parseInt(testId);
    thresholds.testName = getTestName(testId);
    thresholds.gender = gender;
    thresholds.ageGroup = ageGroup;

    res.json(thresholds);
  } catch (error) {
    console.error('Error fetching meter thresholds:', error);
    res.status(500).json({ 
      error: 'Failed to fetch meter thresholds' 
    });
  }
});

/**
 * Get complete scoring data for a test
 * Returns all performance levels and ranges
 */
router.get('/scoring-data/:testId', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const { gender, ageGroup } = req.query;

    const testKey = TEST_ID_MAPPING[testId];
    if (!testKey) {
      return res.status(400).json({ 
        error: 'Invalid test ID' 
      });
    }

    const scoringData = METRIC_SCORING_TABLES[testKey]?.[gender]?.[ageGroup];
    
    if (!scoringData) {
      return res.status(404).json({ 
        error: 'No scoring data found for specified parameters' 
      });
    }

    res.json({
      testId: parseInt(testId),
      testName: getTestName(testId),
      gender,
      ageGroup,
      scoringData,
      isLowerBetter: testId === '5' || testId === 5
    });
  } catch (error) {
    console.error('Error fetching scoring data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scoring data' 
    });
  }
});

// Helper function to get test name
function getTestName(testId) {
  const names = {
    1: '椅子坐立測試',
    2: '肱二頭肌手臂屈舉',
    3: '抓背測驗',
    4: '椅子坐姿體前彎',
    5: '8英呎起身繞行',
    6: '原地站立抬膝'
  };
  return names[testId] || 'Unknown Test';
}

module.exports = router;