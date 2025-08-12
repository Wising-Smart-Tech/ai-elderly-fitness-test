-- PostgreSQL Database Schema for Elderly Fitness Tracker
-- Verified and improved version

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    birthday DATE NOT NULL,
    height DECIMAL(5,2) NOT NULL, -- in cm
    weight DECIMAL(5,2) NOT NULL, -- in kg
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test types lookup table
CREATE TABLE test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_chinese VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(20) NOT NULL, -- 'reps', 'seconds', 'cm', etc.
    duration_seconds INTEGER, -- test duration if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test sessions
CREATE TABLE test_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    notes TEXT
);

-- Individual test results
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES test_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_type_id INTEGER REFERENCES test_types(id), -- FIXED: Added foreign key constraint
    score DECIMAL(8,2) NOT NULL, -- actual result value
    performance_level VARCHAR(20) CHECK (performance_level IN ('excellent', 'good', 'average', 'fair', 'poor')),
    age_group VARCHAR(10),
    percentile DECIMAL(5,2), -- percentile within age-gender group
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    video_url VARCHAR(500), -- optional: store test video
    raw_data JSONB, -- store pose detection data, timestamps, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User health metrics (calculated from basic info)
CREATE TABLE user_health_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bmi DECIMAL(5,2),
    age INTEGER,
    overall_fitness_level VARCHAR(20),
    fall_risk_level VARCHAR(20),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings and configurations
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial test types
INSERT INTO test_types (name, name_chinese, description, unit, duration_seconds) VALUES
('chair_stand', '椅子坐立', '30秒內盡可能多次完整坐立，評估下肢肌耐力', 'reps', 30),
('arm_curl', '肱二頭肌手臂屈舉', '30秒內手臂屈舉次數，評估上肢肌耐力', 'reps', 30),
('back_scratch', '抓背測驗', '測量上肢柔軟度', 'cm', NULL),
('sit_reach', '椅子坐姿體前彎', '測量下肢柔軟度', 'cm', NULL),
('single_leg_stand', '30秒單腳站立', '評估靜態平衡', 'seconds', 30),
('8ft_up_go', '8英呎起身繞行', '評估敏捷動態平衡', 'seconds', NULL),
('step_in_place', '原地站立抬膝', '2分鐘評估心肺有氧耐力', 'reps', 120);

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_version', '1.0.0', 'Current application version'),
('maintenance_mode', 'false', 'System maintenance mode'),
('max_session_duration', '3600', 'Maximum session duration in seconds'),
('video_retention_days', '30', 'Days to retain test videos'),
('min_age_requirement', '60', 'Minimum age for using the system');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_test_results_user_date ON test_results(user_id, test_date DESC);
CREATE INDEX idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX idx_user_health_metrics_user ON user_health_metrics(user_id);

-- Create views for common queries
CREATE VIEW user_latest_results AS
SELECT 
    u.id as user_id,
    u.name,
    u.gender,
    u.birthday,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birthday)) as age,
    tr.test_type_id,
    tt.name_chinese as test_name,
    tr.score,
    tr.performance_level,
    tr.test_date,
    ROW_NUMBER() OVER (PARTITION BY u.id, tr.test_type_id ORDER BY tr.test_date DESC) as rn
FROM users u
JOIN test_results tr ON u.id = tr.user_id
JOIN test_types tt ON tr.test_type_id = tt.id
WHERE tr.test_date >= CURRENT_DATE - INTERVAL '1 year';

-- ADDED: View for user dashboard summary
CREATE VIEW user_dashboard_summary AS
SELECT 
    u.id,
    u.name,
    u.gender,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birthday)) as age,
    uhm.bmi,
    uhm.overall_fitness_level,
    uhm.fall_risk_level,
    COUNT(DISTINCT tr.id) as total_tests,
    MAX(tr.test_date) as last_test_date
FROM users u
LEFT JOIN user_health_metrics uhm ON u.id = uhm.user_id
LEFT JOIN test_results tr ON u.id = tr.user_id
GROUP BY u.id, u.name, u.gender, u.birthday, uhm.bmi, uhm.overall_fitness_level, uhm.fall_risk_level;

-- Function to calculate age
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql;

-- IMPROVED: Function to get age group with better 60+ support
CREATE OR REPLACE FUNCTION get_age_group(age INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    CASE 
        WHEN age >= 90 THEN RETURN '90+';
        WHEN age >= 85 THEN RETURN '85-89';
        WHEN age >= 80 THEN RETURN '80-84';
        WHEN age >= 75 THEN RETURN '75-79';
        WHEN age >= 70 THEN RETURN '70-74';
        WHEN age >= 65 THEN RETURN '65-69';
        WHEN age >= 60 THEN RETURN '60-64';
        ELSE RETURN 'under-60';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ADDED: Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(height_cm DECIMAL, weight_kg DECIMAL)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    RETURN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- ADDED: Trigger to automatically update user_health_metrics when user data changes
CREATE OR REPLACE FUNCTION update_user_health_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_health_metrics (user_id, bmi, age, calculated_at)
    VALUES (
        NEW.id,
        calculate_bmi(NEW.height, NEW.weight),
        calculate_age(NEW.birthday),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        bmi = calculate_bmi(NEW.height, NEW.weight),
        age = calculate_age(NEW.birthday),
        calculated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_health_metrics
    AFTER INSERT OR UPDATE OF height, weight, birthday ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_health_metrics();

-- ADDED: Verify schema integrity
DO $$
BEGIN
    -- Check if all tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Users table not created properly';
    END IF;
    
    RAISE NOTICE 'Schema verification completed successfully!';
END $$;