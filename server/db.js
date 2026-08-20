require('dotenv').config();
const { Pool } = require('pg');

if(!process.env.DATABASE_URL){
  console.error('Missing DATABASE_URL. Copy .env.example to .env and fill in your Neon connection string.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

module.exports = pool;
