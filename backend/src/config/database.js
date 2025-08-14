// src/config/database.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '35.194.136.118',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'WiSiNG1234',
    database: process.env.DB_NAME || 'fitness-tracker-ai',
    port: process.env.DB_PORT || 5432,
    
    // Connection pool settings
    max: 20, // maximum number of clients in the pool
    min: 2,  // minimum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // return an error after 10 seconds if connection could not be established
    maxUses: 7500, // close connections after 7500 uses (optional)
    
    // SSL configuration for Google Cloud SQL
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    
    // Connection string fallback
    connectionString: process.env.DB_CONNECTION || 
        `postgresql://postgres:WiSiNG1234@35.194.136.118:5432/fitness-tracker-ai`
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool event listeners
pool.on('connect', (client) => {
    logger.info(`Database client connected: ${client.processID}`);
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('acquire', (client) => {
    logger.debug(`Client acquired: ${client.processID}`);
});

pool.on('remove', (client) => {
    logger.debug(`Client removed: ${client.processID}`);
});

// Database connection function
async function connectDB() {
    try {
        const client = await pool.connect();
        logger.info('Successfully connected to PostgreSQL database');
        
        // Test the connection
        const result = await client.query('SELECT NOW()');
        logger.info(`Database time: ${result.rows[0].now}`);
        
        // Check if required tables exist
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'test_types', 'test_results', 'test_sessions')
        `;
        
        const tablesResult = await client.query(tablesQuery);
        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        logger.info(`Existing tables: ${existingTables.join(', ')}`);
        
        if (existingTables.length < 4) {
            logger.warn('Some required tables are missing. Please run database migrations.');
        }
        
        client.release();
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
}

// Query helper function
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        logger.debug('Executed query', {
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            duration: `${duration}ms`,
            rows: result.rowCount
        });
        
        return result;
    } catch (error) {
        logger.error('Query error:', {
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            error: error.message,
            params: params
        });
        throw error;
    }
}

// Transaction helper
async function transaction(callback) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Get database statistics
async function getDBStats() {
    try {
        const stats = await query(`
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats 
            WHERE schemaname = 'public'
            ORDER BY tablename, attname
        `);
        
        const poolStats = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
        
        return {
            tableStats: stats.rows,
            poolStats: poolStats
        };
    } catch (error) {
        logger.error('Error getting database statistics:', error);
        throw error;
    }
}

// Graceful shutdown
async function closeDB() {
    try {
        await pool.end();
        logger.info('Database pool closed successfully');
    } catch (error) {
        logger.error('Error closing database pool:', error);
        throw error;
    }
}

module.exports = {
    pool,
    connectDB,
    query,
    transaction,
    getDBStats,
    closeDB
};