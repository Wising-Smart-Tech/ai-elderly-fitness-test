// Script to create an admin user
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'elderly_fitness',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function createAdminUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const query = `
      INSERT INTO users (
        name, email, password_hash, role, gender, 
        birthday, height, weight, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) 
      ON CONFLICT (email) DO UPDATE 
      SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email, name, role;
    `;
    
    const values = [
      'Admin User',           // name
      'admin@example.com',    // email  
      hashedPassword,         // password_hash
      'admin',               // role
      'male',                // gender
      '1970-01-01',         // birthday
      175,                   // height (cm)
      70,                    // weight (kg)
      true                   // is_active
    ];
    
    const result = await pool.query(query, values);
    console.log('Admin user created successfully:', result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();