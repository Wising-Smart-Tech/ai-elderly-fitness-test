// src/services/testService.js
const { query, transaction } = require("../config/database");
const { logger } = require("../utils/logger");
const { AppError } = require("../utils/errors");

class TestService {
  async getAllTestTypes() {
    try {
      const result = await query(`
                SELECT id, name, name_chinese, description, unit, duration_seconds
                FROM test_types
                ORDER BY id
            `);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching test types:", error);
      throw new AppError("Failed to fetch test types", 500);
    }
  }

  async createSession(userId, notes = null) {
    try {
      const result = await query(
        `
                INSERT INTO test_sessions (user_id, notes, session_start)
                VALUES ($1, $2, NOW())
                RETURNING id, user_id, session_start, status, notes
            `,
        [userId, notes]
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating test session:", error);
      throw new AppError("Failed to create test session", 500);
    }
  }

  async completeSession(sessionId, userId) {
    try {
      const result = await query(
        `
                UPDATE test_sessions 
                SET session_end = NOW(), status = 'completed'
                WHERE id = $1 AND user_id = $2 AND status = 'in_progress'
                RETURNING id, user_id, session_start, session_end, status, notes
            `,
        [sessionId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Session not found or already completed", 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error completing test session:", error);
      throw new AppError("Failed to complete test session", 500);
    }
  }

  async saveTestResult(resultData) {
    try {
      const {
        sessionId,
        userId,
        testTypeId,
        score,
        rawData,
      } = resultData;

      // Get user info to calculate performance level
      const userResult = await query(
        `SELECT gender, birthday FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new AppError("User not found", 404);
      }
      
      const user = userResult.rows[0];
      const age = Math.floor(
        (Date.now() - new Date(user.birthday)) / (365.25 * 24 * 60 * 60 * 1000)
      );
      const ageGroup = this.getAgeGroup(age);
      
      // Calculate performance level using database function
      const performanceResult = await query(
        `SELECT get_performance_level($1, $2, $3, $4) as performance_level`,
        [testTypeId, user.gender, ageGroup, score]
      );
      
      const performanceLevel = performanceResult.rows[0].performance_level;
      
      // Calculate percentile
      const percentileResult = await query(
        `SELECT calculate_percentile($1, $2, $3, $4) as percentile`,
        [testTypeId, user.gender, ageGroup, score]
      );
      
      const percentile = percentileResult.rows[0].percentile;

      const result = await query(
        `
                INSERT INTO test_results (
                    session_id, user_id, test_type_id, score, 
                    performance_level, age_group, percentile, raw_data, test_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING *
            `,
        [
          sessionId,
          userId,
          testTypeId,
          score,
          performanceLevel,
          ageGroup,
          percentile,
          JSON.stringify(rawData),
        ]
      );

      // Update user health metrics
      await this.updateUserHealthMetrics(userId);

      return result.rows[0];
    } catch (error) {
      logger.error("Error saving test result:", error);
      throw new AppError("Failed to save test result", 500);
    }
  }

  async calculatePerformanceLevel(testTypeId, score, age, gender) {
    try {
      const ageGroup = this.getAgeGroup(age);
      
      // Use database function to calculate performance level
      const result = await query(
        `SELECT get_performance_level($1, $2, $3, $4) as performance_level`,
        [testTypeId, gender, ageGroup, score]
      );
      
      return result.rows[0].performance_level || "average";
    } catch (error) {
      logger.error("Error calculating performance level:", error);
      return "average";
    }
  }
  
  async calculatePercentile(testTypeId, score, age, gender) {
    try {
      const ageGroup = this.getAgeGroup(age);
      
      // Use database function to calculate percentile
      const result = await query(
        `SELECT calculate_percentile($1, $2, $3, $4) as percentile`,
        [testTypeId, gender, ageGroup, score]
      );
      
      return result.rows[0].percentile || 50.0;
    } catch (error) {
      logger.error("Error calculating percentile:", error);
      return 50.0;
    }
  }

  getAgeGroup(age) {
    if (age >= 90) return "90+";
    if (age >= 85) return "85-89";
    if (age >= 80) return "80-84";
    if (age >= 75) return "75-79";
    if (age >= 70) return "70-74";
    if (age >= 65) return "65-69";
    return "60-64"; // Default for ages 60-64
  }

  async getUserResults(userId, options = {}) {
    try {
      const { testType, limit = 10, offset = 0 } = options;

      let whereClause = "WHERE tr.user_id = $1";
      let params = [userId];

      if (testType) {
        whereClause += " AND tr.test_type_id = $2";
        params.push(testType);
      }

      const result = await query(
        `
                SELECT 
                    tr.id,
                    tr.score,
                    tr.performance_level,
                    tr.age_group,
                    tr.test_date,
                    tt.name,
                    tt.name_chinese,
                    tt.unit,
                    ts.session_start,
                    ts.session_end
                FROM test_results tr
                JOIN test_types tt ON tr.test_type_id = tt.id
                JOIN test_sessions ts ON tr.session_id = ts.id
                ${whereClause}
                ORDER BY tr.test_date DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await query(
        `
                SELECT COUNT(*) as total
                FROM test_results tr
                ${whereClause}
            `,
        params
      );

      return {
        results: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
      };
    } catch (error) {
      logger.error("Error fetching user results:", error);
      throw new AppError("Failed to fetch user results", 500);
    }
  }

  async getLatestResults(userId) {
    try {
      const result = await query(
        `
                SELECT DISTINCT ON (tr.test_type_id)
                    tr.id,
                    tr.score,
                    tr.performance_level,
                    tr.age_group,
                    tr.test_date,
                    tt.name,
                    tt.name_chinese,
                    tt.unit
                FROM test_results tr
                JOIN test_types tt ON tr.test_type_id = tt.id
                WHERE tr.user_id = $1
                ORDER BY tr.test_type_id, tr.test_date DESC
            `,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching latest results:", error);
      throw new AppError("Failed to fetch latest results", 500);
    }
  }

  async getResultDetail(resultId) {
    try {
      const result = await query(
        `
                SELECT 
                    tr.*,
                    tt.name,
                    tt.name_chinese,
                    tt.description,
                    tt.unit,
                    u.name as user_name,
                    u.gender,
                    u.birthday
                FROM test_results tr
                JOIN test_types tt ON tr.test_type_id = tt.id
                JOIN users u ON tr.user_id = u.id
                WHERE tr.id = $1
            `,
        [resultId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Test result not found", 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error fetching result detail:", error);
      throw new AppError("Failed to fetch result detail", 500);
    }
  }

  async getStatistics(filters = {}) {
    try {
      const { gender, ageGroup, testType } = filters;

      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      if (gender) {
        whereConditions.push(`u.gender = $${paramIndex++}`);
        params.push(gender);
      }

      if (ageGroup) {
        whereConditions.push(`tr.age_group = $${paramIndex++}`);
        params.push(ageGroup);
      }

      if (testType) {
        whereConditions.push(`tr.test_type_id = $${paramIndex++}`);
        params.push(testType);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      const result = await query(
        `
                SELECT 
                    COUNT(*) as total_tests,
                    AVG(tr.score) as avg_score,
                    MIN(tr.score) as min_score,
                    MAX(tr.score) as max_score,
                    AVG(tr.percentile) as avg_percentile,
                    tr.performance_level,
                    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
                FROM test_results tr
                JOIN users u ON tr.user_id = u.id
                ${whereClause}
                GROUP BY tr.performance_level
                ORDER BY 
                    CASE tr.performance_level
                        WHEN 'excellent' THEN 1
                        WHEN 'good' THEN 2
                        WHEN 'average' THEN 3
                        WHEN 'fair' THEN 4
                        WHEN 'poor' THEN 5
                    END
            `,
        params
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching statistics:", error);
      throw new AppError("Failed to fetch statistics", 500);
    }
  }
  
  async getScoringStandards(testTypeId, gender, ageGroup) {
    try {
      const result = await query(
        `
          SELECT * FROM fitness_scoring_standards
          WHERE test_type_id = $1 AND gender = $2 AND age_group = $3
        `,
        [testTypeId, gender, ageGroup]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error("Error fetching scoring standards:", error);
      return null;
    }
  }

  async updateUserHealthMetrics(userId) {
    try {
      // Get user basic info
      const userResult = await query(
        `
                SELECT gender, birthday, height, weight
                FROM users
                WHERE id = $1
            `,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new AppError("User not found", 404);
      }

      const user = userResult.rows[0];
      const age = Math.floor(
        (Date.now() - new Date(user.birthday)) / (365.25 * 24 * 60 * 60 * 1000)
      );
      const bmi = user.weight / (user.height / 100) ** 2;

      // Get latest test results for health assessment
      const latestResults = await this.getLatestResults(userId);

      // Calculate overall fitness level and fall risk
      const overallFitness = this.calculateOverallFitness(latestResults);
      const fallRisk = this.calculateFallRisk(latestResults, age);

      // Update or insert health metrics
      await query(
        `
                INSERT INTO user_health_metrics (user_id, bmi, age, fall_risk_level, overall_fitness_level)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    bmi = EXCLUDED.bmi,
                    age = EXCLUDED.age,
                    fall_risk_level = EXCLUDED.fall_risk_level,
                    overall_fitness_level = EXCLUDED.overall_fitness_level,
                    calculated_at = NOW()
            `,
        [userId, bmi.toFixed(2), age, fallRisk, overallFitness]
      );
    } catch (error) {
      logger.error("Error updating user health metrics:", error);
      // Don't throw error as this is supplementary data
    }
  }

  calculateOverallFitness(results) {
    if (results.length === 0) return "unknown";

    const levelScores = {
      excellent: 5,
      good: 4,
      average: 3,
      fair: 2,
      poor: 1,
    };

    const avgScore =
      results.reduce((sum, result) => {
        return sum + (levelScores[result.performance_level] || 3);
      }, 0) / results.length;

    if (avgScore >= 4.5) return "excellent";
    if (avgScore >= 3.5) return "good";
    if (avgScore >= 2.5) return "average";
    if (avgScore >= 1.5) return "fair";
    return "poor";
  }

  calculateFallRisk(results, age) {
    // Focus on balance and strength tests for fall risk
    const balanceTests = results.filter(
      (r) => r.name === "8ft_up_go"
    );

    const strengthTests = results.filter((r) => r.name === "chair_stand");

    let riskScore = 0;

    // Age factor
    if (age >= 85) riskScore += 2;
    else if (age >= 75) riskScore += 1;

    // Balance performance
    balanceTests.forEach((test) => {
      if (test.performance_level === "poor") riskScore += 3;
      else if (test.performance_level === "fair") riskScore += 2;
      else if (test.performance_level === "average") riskScore += 1;
    });

    // Strength performance
    strengthTests.forEach((test) => {
      if (test.performance_level === "poor") riskScore += 2;
      else if (test.performance_level === "fair") riskScore += 1;
    });

    if (riskScore >= 6) return "high";
    if (riskScore >= 3) return "moderate";
    return "low";
  }

  async generateRecommendations(testResult) {
    try {
      const recommendations = [];

      // Generate recommendations based on performance level
      switch (testResult.performance_level) {
        case "poor":
          recommendations.push({
            type: "medical",
            title: "建議諮詢醫療專業人員",
            description:
              "您的測試結果顯示體能狀況需要改善，建議諮詢醫師或物理治療師制定個人化運動計畫。",
            priority: "high",
          });
          break;

        case "fair":
          recommendations.push({
            type: "exercise",
            title: "加強肌力訓練",
            description: "建議每週進行3-4次輕度阻力訓練，循序漸進提升肌力。",
            priority: "medium",
          });
          break;

        case "average":
          recommendations.push({
            type: "exercise",
            title: "維持規律運動",
            description:
              "您的體能狀況屬於平均水準，建議維持目前運動習慣並適度增加強度。",
            priority: "medium",
          });
          break;

        case "good":
        case "excellent":
          recommendations.push({
            type: "lifestyle",
            title: "繼續保持優秀表現",
            description: "您的體能狀況很好！請繼續保持目前的運動習慣。",
            priority: "low",
          });
          break;
      }

      // Save recommendations to database
      for (const rec of recommendations) {
        await query(
          `
                    INSERT INTO fitness_recommendations 
                    (user_id, test_result_id, recommendation_type, title, description, priority)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `,
          [
            testResult.user_id,
            testResult.id,
            rec.type,
            rec.title,
            rec.description,
            rec.priority,
          ]
        );
      }

      return recommendations;
    } catch (error) {
      logger.error("Error generating recommendations:", error);
      return [];
    }
  }
}

module.exports = new TestService();
