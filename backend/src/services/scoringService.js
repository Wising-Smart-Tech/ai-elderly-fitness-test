
// backend/src/services/scoringService.js
// Service for handling fitness test scoring

const { query } = require('../config/database');
const { logger } = require('../utils/logger');

class ScoringService {
    
    // Get performance level for a test result
    async getPerformanceLevel(testTypeId, gender, age, score) {
        try {
            const ageGroup = this.getAgeGroup(age);
            
            const result = await query(`
                SELECT get_performance_level($1, $2, $3, $4) as performance_level
            `, [testTypeId, gender, ageGroup, score]);
            
            return result.rows[0]?.performance_level || 'average';
        } catch (error) {
            logger.error('Error calculating performance level:', error);
            return 'average';
        }
    }
    
    // Calculate percentile for a test result
    async calculatePercentile(testTypeId, gender, age, score) {
        try {
            const ageGroup = this.getAgeGroup(age);
            
            const result = await query(`
                SELECT calculate_percentile($1, $2, $3, $4) as percentile
            `, [testTypeId, gender, ageGroup, score]);
            
            return result.rows[0]?.percentile || 50.0;
        } catch (error) {
            logger.error('Error calculating percentile:', error);
            return 50.0;
        }
    }
    
    // Get scoring standards for a test
    async getScoringStandards(testTypeId, gender, age) {
        try {
            const ageGroup = this.getAgeGroup(age);
            
            const result = await query(`
                SELECT * FROM fitness_scoring_standards
                WHERE test_type_id = $1 AND gender = $2 AND age_group = $3
            `, [testTypeId, gender, ageGroup]);
            
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error getting scoring standards:', error);
            return null;
        }
    }
    
    // Calculate comprehensive score for a test session
    async calculateSessionScore(sessionId) {
        try {
            const result = await query(`
                SELECT 
                    tr.test_type_id,
                    tr.score,
                    tt.name as test_name,
                    get_performance_level(tr.test_type_id, u.gender, get_age_group(calculate_age(u.birthday)), tr.score) as performance_level,
                    calculate_percentile(tr.test_type_id, u.gender, get_age_group(calculate_age(u.birthday)), tr.score) as percentile
                FROM test_results tr
                JOIN users u ON tr.user_id = u.user_id
                JOIN test_types tt ON tr.test_type_id = tt.id
                WHERE tr.session_id = $1
            `, [sessionId]);
            
            // Calculate average percentile
            const scores = result.rows;
            const avgPercentile = scores.reduce((sum, s) => sum + parseFloat(s.percentile), 0) / scores.length;
            
            // Determine overall fitness level
            let overallLevel = 'average';
            if (avgPercentile >= 75) overallLevel = 'excellent';
            else if (avgPercentile >= 60) overallLevel = 'good';
            else if (avgPercentile >= 40) overallLevel = 'average';
            else if (avgPercentile >= 25) overallLevel = 'fair';
            else overallLevel = 'poor';
            
            return {
                testScores: scores,
                averagePercentile: avgPercentile,
                overallFitnessLevel: overallLevel
            };
        } catch (error) {
            logger.error('Error calculating session score:', error);
            throw error;
        }
    }
    
    // Helper function to get age group
    getAgeGroup(age) {
        if (age >= 90) return '90+';
        if (age >= 85) return '85-89';
        if (age >= 80) return '80-84';
        if (age >= 75) return '75-79';
        if (age >= 70) return '70-74';
        if (age >= 65) return '65-69';
        if (age >= 60) return '60-64';
        return 'under-60';
    }
}

module.exports = new ScoringService();