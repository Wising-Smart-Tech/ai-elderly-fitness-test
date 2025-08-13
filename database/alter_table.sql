-- First, create custom ENUM types for PostgreSQL
CREATE TYPE user_role AS ENUM ('admin', 'elderly_user');

-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'elderly_user';
ALTER TABLE users ADD COLUMN created_by INT; -- For admin-created users
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_created_by 
FOREIGN KEY (created_by) REFERENCES users(id);

-- Create index for role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);