// Script to create an elderly user
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

async function createElderlyUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('user123', 10);
    
    // Create elderly user
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
      '張大明',                    // name
      'elderly@example.com',      // email  
      hashedPassword,             // password_hash
      'elderly_user',            // role
      'male',                    // gender
      '1955-06-15',             // birthday (68 years old)
      168,                      // height (cm)
      65,                       // weight (kg)
      true                      // is_active
    ];
    
    const result = await pool.query(query, values);
    console.log('Elderly user created successfully:', result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('Email: elderly@example.com');
    console.log('Password: user123');
    
  } catch (error) {
    console.error('Error creating elderly user:', error);
  } finally {
    await pool.end();
  }
}

createElderlyUser();