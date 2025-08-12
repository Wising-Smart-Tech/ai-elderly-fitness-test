// backend/migrations/add_scoring_tables.js
const { Pool } = require('pg');
const { METRIC_SCORING_TABLES } = require('./metric_scoring_tables');

const dbConfig = {
    host: process.env.DB_HOST || '35.194.136.118',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'WiSiNG1234',
    database: process.env.DB_NAME || 'fitness-tracker-ai',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting fitness scoring tables migration...');
        
        // Begin transaction
        await client.query('BEGIN');
        
        // 1. Create fitness_scoring_standards table
        console.log('📊 Creating fitness_scoring_standards table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS fitness_scoring_standards (
                id SERIAL PRIMARY KEY,
                test_type_id INTEGER REFERENCES test_types(id) ON DELETE CASCADE,
                gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
                age_group VARCHAR(10) NOT NULL,
                mean_score DECIMAL(8,2),
                std_deviation DECIMAL(8,2),
                p10 DECIMAL(8,2),
                p25 DECIMAL(8,2),
                p50 DECIMAL(8,2),
                p75 DECIMAL(8,2),
                p90 DECIMAL(8,2),
                poor_min DECIMAL(8,2),
                poor_max DECIMAL(8,2),
                fair_min DECIMAL(8,2),
                fair_max DECIMAL(8,2),
                average_min DECIMAL(8,2),
                average_max DECIMAL(8,2),
                good_min DECIMAL(8,2),
                good_max DECIMAL(8,2),
                excellent_min DECIMAL(8,2),
                excellent_max DECIMAL(8,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(test_type_id, gender, age_group)
            )
        `);

        // 2. Create indexes for better performance
        console.log('🔍 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_scoring_test_gender_age 
            ON fitness_scoring_standards(test_type_id, gender, age_group)
        `);

        // 3. Update test_types table with metric units
        console.log('📏 Updating test types with metric units...');
        const testTypeUpdates = [
            { name: 'chair_stand', unit: 'reps', description: '30秒內盡可能多次完整坐立，評估下肢肌耐力' },
            { name: 'arm_curl', unit: 'reps', description: '30秒內手臂屈舉次數，評估上肢肌耐力 (男性3.6kg，女性2.3kg)' },
            { name: 'back_scratch', unit: 'cm', description: '測量上肢柔軟度，兩手指尖距離' },
            { name: 'sit_reach', unit: 'cm', description: '椅子坐姿體前彎，測量下肢柔軟度' },
            { name: 'single_leg_stand', unit: 'seconds', description: '30秒單腳站立，評估靜態平衡' },
            { name: '8ft_up_go', unit: 'seconds', description: '2.44公尺起身繞行，評估敏捷動態平衡' },
            { name: 'step_in_place', unit: 'reps', description: '2分鐘原地站立抬膝，評估心肺有氧耐力' },
        ];

        for (const testType of testTypeUpdates) {
            await client.query(`
                UPDATE test_types 
                SET unit = $1, description = $2 
                WHERE name = $3
            `, [testType.unit, testType.description, testType.name]);
        }

        // 4. Insert all scoring data
        console.log('📊 Inserting scoring standards...');
        
        // Map test names to IDs (matching metric_scoring_tables.js keys and database test_types)
        const testNameToId = {
            'chair_stand': 1,      // ID 1 in test_types table
            'arm_curl': 2,         // ID 2 in test_types table
            'back_scratch': 3,     // ID 3 in test_types table
            'sit_reach': 4,        // ID 4 in test_types table
            // 'single_leg_stand': 5, // No scoring data available in metric_scoring_tables.js
            '8ft_up_go': 6,        // ID 6 in test_types table
            'step_in_place': 7,    // ID 7 in test_types table
        };

        // Clear existing data
        await client.query('DELETE FROM fitness_scoring_standards');

        let insertCount = 0;
        for (const [testName, testData] of Object.entries(METRIC_SCORING_TABLES)) {
            const testTypeId = testNameToId[testName];
            if (!testTypeId) {
                console.warn(`⚠️  Test type not found: ${testName}`);
                continue;
            }

            for (const [gender, genderData] of Object.entries(testData)) {
                for (const [ageGroup, standards] of Object.entries(genderData)) {
                    try {
                        await client.query(`
                            INSERT INTO fitness_scoring_standards (
                                test_type_id, gender, age_group, mean_score, std_deviation,
                                p10, p25, p50, p75, p90,
                                poor_min, poor_max, fair_min, fair_max,
                                average_min, average_max, good_min, good_max,
                                excellent_min, excellent_max
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
                            )
                        `, [
                            testTypeId, gender, ageGroup, 
                            standards.mean, standards.std,
                            standards.percentiles.p10, standards.percentiles.p25, 
                            standards.percentiles.p50, standards.percentiles.p75, 
                            standards.percentiles.p90,
                            standards.poor[0], standards.poor[1],
                            standards.fair[0], standards.fair[1],
                            standards.average[0], standards.average[1],
                            standards.good[0], standards.good[1],
                            standards.excellent[0], standards.excellent[1]
                        ]);
                        insertCount++;
                    } catch (error) {
                        console.error(`❌ Error inserting ${testName}-${gender}-${ageGroup}:`, error.message);
                    }
                }
            }
        }

        // 5. Create helper functions
        console.log('🔧 Creating helper functions...');
        
        // Function to get performance level
        await client.query(`
            CREATE OR REPLACE FUNCTION get_performance_level(
                p_test_type_id INTEGER,
                p_gender VARCHAR(10),
                p_age_group VARCHAR(10),
                p_score DECIMAL(8,2)
            )
            RETURNS VARCHAR(20) AS $$
            DECLARE
                scoring_record RECORD;
                is_lower_better BOOLEAN := FALSE;
            BEGIN
                -- Get scoring standards
                SELECT * INTO scoring_record
                FROM fitness_scoring_standards
                WHERE test_type_id = p_test_type_id 
                AND gender = p_gender 
                AND age_group = p_age_group;
                
                IF NOT FOUND THEN
                    RETURN 'average';
                END IF;
                
                -- Check if this is a "lower is better" test (8ft up-and-go)
                SELECT name = '8ft_up_go' INTO is_lower_better
                FROM test_types 
                WHERE id = p_test_type_id;
                
                IF is_lower_better THEN
                    -- For 8ft up-and-go, lower scores are better
                    IF p_score <= scoring_record.excellent_max THEN
                        RETURN 'excellent';
                    ELSIF p_score <= scoring_record.good_max THEN
                        RETURN 'good';
                    ELSIF p_score <= scoring_record.average_max THEN
                        RETURN 'average';
                    ELSIF p_score <= scoring_record.fair_max THEN
                        RETURN 'fair';
                    ELSE
                        RETURN 'poor';
                    END IF;
                ELSE
                    -- For all other tests, higher scores are better
                    IF p_score >= scoring_record.excellent_min AND p_score <= scoring_record.excellent_max THEN
                        RETURN 'excellent';
                    ELSIF p_score >= scoring_record.good_min AND p_score <= scoring_record.good_max THEN
                        RETURN 'good';
                    ELSIF p_score >= scoring_record.average_min AND p_score <= scoring_record.average_max THEN
                        RETURN 'average';
                    ELSIF p_score >= scoring_record.fair_min AND p_score <= scoring_record.fair_max THEN
                        RETURN 'fair';
                    ELSE
                        RETURN 'poor';
                    END IF;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Function to calculate percentile
        await client.query(`
            CREATE OR REPLACE FUNCTION calculate_percentile(
                p_test_type_id INTEGER,
                p_gender VARCHAR(10),
                p_age_group VARCHAR(10),
                p_score DECIMAL(8,2)
            )
            RETURNS DECIMAL(5,2) AS $$
            DECLARE
                scoring_record RECORD;
                percentile_value DECIMAL(5,2);
            BEGIN
                -- Get scoring standards
                SELECT * INTO scoring_record
                FROM fitness_scoring_standards
                WHERE test_type_id = p_test_type_id 
                AND gender = p_gender 
                AND age_group = p_age_group;
                
                IF NOT FOUND THEN
                    RETURN 50.0; -- Default to 50th percentile if no data
                END IF;
                
                -- Simple percentile estimation based on available percentile data
                IF p_score <= scoring_record.p10 THEN
                    percentile_value := 10.0;
                ELSIF p_score <= scoring_record.p25 THEN
                    -- Linear interpolation between p10 and p25
                    percentile_value := 10.0 + (p_score - scoring_record.p10) / (scoring_record.p25 - scoring_record.p10) * 15.0;
                ELSIF p_score <= scoring_record.p50 THEN
                    -- Linear interpolation between p25 and p50
                    percentile_value := 25.0 + (p_score - scoring_record.p25) / (scoring_record.p50 - scoring_record.p25) * 25.0;
                ELSIF p_score <= scoring_record.p75 THEN
                    -- Linear interpolation between p50 and p75
                    percentile_value := 50.0 + (p_score - scoring_record.p50) / (scoring_record.p75 - scoring_record.p50) * 25.0;
                ELSIF p_score <= scoring_record.p90 THEN
                    -- Linear interpolation between p75 and p90
                    percentile_value := 75.0 + (p_score - scoring_record.p75) / (scoring_record.p90 - scoring_record.p75) * 15.0;
                ELSE
                    percentile_value := 90.0;
                END IF;
                
                -- Ensure percentile is between 1 and 99
                RETURN GREATEST(1.0, LEAST(99.0, percentile_value));
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 6. Create view for easy access to scoring data
        await client.query(`
            CREATE OR REPLACE VIEW test_scoring_view AS
            SELECT 
                tt.id as test_type_id,
                tt.name as test_name,
                tt.name_chinese,
                tt.unit,
                fss.gender,
                fss.age_group,
                fss.mean_score,
                fss.std_deviation,
                fss.p50 as median_score,
                fss.poor_min, fss.poor_max,
                fss.fair_min, fss.fair_max,
                fss.average_min, fss.average_max,
                fss.good_min, fss.good_max,
                fss.excellent_min, fss.excellent_max
            FROM fitness_scoring_standards fss
            JOIN test_types tt ON fss.test_type_id = tt.id
            ORDER BY tt.id, fss.gender, fss.age_group
        `);

        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Migration completed successfully!`);
        console.log(`📊 Inserted ${insertCount} scoring standards`);
        console.log(`🔧 Created helper functions for performance calculation`);
        console.log(`👀 Created test_scoring_view for easy data access`);
        
        // Test the functions
        console.log('\n🧪 Testing functions...');
        const testResult = await client.query(`
            SELECT 
                get_performance_level(1, 'male', '65-69', 15) as performance_level,
                calculate_percentile(1, 'male', '65-69', 15) as percentile
        `);
        console.log('Test result for chair stand (male, 65-69, score 15):', testResult.rows[0]);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };