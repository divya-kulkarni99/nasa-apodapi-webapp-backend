const { Pool } = require('pg');

let pool = null;

module.exports = async () => {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error(
      '❌ Database connection string is not set in environment variables'
    );
    console.error(
      '   Please set either DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME'
    );
    return;
  }

  try {
    // Use DATABASE_URL if provided (common for services like Heroku, Railway, Supabase, etc.)
    // Otherwise construct from individual variables
    const isSupabase = process.env.DATABASE_URL?.includes('supabase.co');

    const connectionConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          // Supabase and most cloud providers require SSL
          ssl:
            isSupabase || process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };

    pool = new Pool(connectionConfig);

    // Test the connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database successfully');

    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        "googleId" VARCHAR(255) UNIQUE,
        picture VARCHAR(500),
        "authProvider" VARCHAR(50) DEFAULT 'local',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create index on googleId for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId")
    `);

    console.log('✅ Database tables initialized');
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Possible solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Verify PostgreSQL server is running');
      console.error('3. Check database credentials in .env file');
      console.error(
        '4. Verify DATABASE_URL or DB_* variables are set correctly'
      );
    }

    console.error(
      '\n⚠️  Server will continue but database operations will fail'
    );
  }
};

// Export pool for use in models
module.exports.getPool = () => pool;
