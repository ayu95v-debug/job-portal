require("dotenv").config();

const { Pool } = require("pg");

// Check DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing in .env file");
  process.exit(1);
}

// Create PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test Connection
(async () => {
  try {
    const client = await pool.connect();

    console.log("✅ Connected to Supabase PostgreSQL");

    const result = await client.query("SELECT NOW()");
    console.log("📅 Database Time:", result.rows[0].now);

    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL Connection Error:");
    console.error(err);
  }
})();

// Handle unexpected pool errors
pool.on("error", (err) => {
  console.error("❌ Unexpected PostgreSQL Error");
  console.error(err);
});

// Query Helper
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("❌ Query Error");
    console.error(err);
    throw err;
  }
};

module.exports = {
  query,
  pool,
};