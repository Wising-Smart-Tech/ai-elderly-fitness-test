import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to fetch meter thresholds from the API
 * Returns the exact threshold values needed to draw the meter correctly
 * 
 * @param {number} testId - The test ID (1-6)
 * @param {string} gender - User's gender ('male' or 'female')
 * @param {string} ageGroup - User's age group (e.g., '60-64', '65-69', etc.)
 * @returns {Object} Meter thresholds and loading state
 */
export const useMeterThresholds = (testId, gender, ageGroup) => {
  const { token } = useAuth();
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThresholds = async () => {
      // Skip if missing required parameters
      if (!testId || !gender || !ageGroup || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3000/api/scoring/meter-thresholds/${testId}?gender=${gender}&ageGroup=${ageGroup}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch thresholds: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Thresholds received:', data);
        setThresholds(data);
      } catch (err) {
        console.error('Error fetching meter thresholds:', err);
        console.error('Test ID:', testId, 'Gender:', gender, 'Age Group:', ageGroup);
        setError(err.message);
        
        // Fallback to hardcoded values if API fails
        setThresholds(getFallbackThresholds(testId, gender, ageGroup));
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
  }, [testId, gender, ageGroup, token]);

  return { thresholds, loading, error };
};

/**
 * Get fallback thresholds in case API fails
 * This ensures the meter can still be drawn with approximate values
 */
function getFallbackThresholds(testId, gender, ageGroup) {
  // Default thresholds for fallback
  const isLowerBetter = testId === 5;
  
  if (isLowerBetter) {
    // Test 5: 8-foot Up and Go (lower is better)
    return {
      fairMin: 8.5,
      averageMin: 7.0,
      goodMin: 5.8,
      excellentMin: 4.9,
      isLowerBetter: true,
      testId: 5
    };
  }

  // Age-adjusted defaults for tests where higher is better
  // For 90+ age group, use much lower thresholds
  const isElderly = ageGroup === '90+' || ageGroup === '85-89';
  
  const defaults = {
    1: isElderly ? 
      { fair: 2, average: 5, good: 10, excellent: 13 } :  // Chair Stand for 90+
      { fair: 10, average: 13, good: 16, excellent: 19 }, // Chair Stand default
    2: isElderly ?
      { fair: 5, average: 8, good: 13, excellent: 16 } :  // Arm Curl for 90+
      { fair: 11, average: 14, good: 17, excellent: 20 }, // Arm Curl default
    3: { fair: -20, average: -5, good: 2, excellent: 10 }, // Back Scratch
    4: { fair: -3, average: 5, good: 10, excellent: 15 },  // Sit and Reach
    6: isElderly ?
      { fair: 35, average: 49, good: 67, excellent: 80 } : // Step in Place for 90+
      { fair: 65, average: 75, good: 90, excellent: 105 }  // Step in Place default
  };

  const testDefaults = defaults[testId] || defaults[1];
  
  return {
    fairMin: testDefaults.fair,
    averageMin: testDefaults.average,
    goodMin: testDefaults.good,
    excellentMin: testDefaults.excellent,
    isLowerBetter: false,
    testId: parseInt(testId)
  };
}

/**
 * Helper function to get meter positions based on thresholds
 * Returns positions as percentages for drawing the meter
 */
export const getMeterPositions = (thresholds) => {
  if (!thresholds) return null;

  // Fixed positions for the meter
  // First divider at 10%, excellent at 90%
  return {
    fair: 10,      // Fair starts at 10%
    average: 36,   // Average at 36%
    good: 63,      // Good at 63%
    excellent: 90  // Excellent at 90%
  };
};

/**
 * Calculate user's score position on the meter
 * @param {number} score - User's actual score
 * @param {Object} thresholds - Threshold values from API
 * @returns {number} Position as percentage (0-100)
 */
export const calculateScorePosition = (score, thresholds) => {
  if (!thresholds) return 50; // Default to middle if no thresholds

  const { fairMin, excellentMin, isLowerBetter } = thresholds;

  if (!isLowerBetter) {
    // Higher is better
    if (score >= excellentMin) {
      // Score is excellent or better - position between 90-98%
      return Math.min(98, 90 + ((score - excellentMin) / (excellentMin * 0.2)) * 8);
    } else if (score < fairMin) {
      // Score is below fair - position between 0-10%
      return Math.max(2, (score / fairMin) * 10);
    } else {
      // Score is between fair and excellent - map to 10-90%
      const range = excellentMin - fairMin;
      const offset = score - fairMin;
      return 10 + (offset / range) * 80;
    }
  } else {
    // Lower is better (Test 5)
    if (score <= excellentMin) {
      // Excellent or better
      return Math.min(98, 90 + ((excellentMin - score) / (excellentMin * 0.2)) * 8);
    } else if (score > fairMin) {
      // Worse than fair
      return Math.max(2, 10 - ((score - fairMin) / (fairMin * 0.2)) * 8);
    } else {
      // Between excellent and fair
      const range = fairMin - excellentMin;
      const offset = fairMin - score;
      return 10 + (offset / range) * 80;
    }
  }
};

export default useMeterThresholds;