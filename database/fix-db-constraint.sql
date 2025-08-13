-- Add unique constraint on user_id for user_health_metrics table
ALTER TABLE user_health_metrics 
ADD CONSTRAINT user_health_metrics_user_id_unique UNIQUE (user_id);

-- Verify the constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_health_metrics';