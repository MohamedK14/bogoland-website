// One-time script: moves the admin account from ADMIN_EMAIL/ADMIN_PASSWORD_HASH
// (in .env) into the admin_account table, so the admin can change their own
// credentials later from the admin panel instead of needing env var access.
// Safe to re-run — does nothing if a row already exists.
require('dotenv').config();
const pool = require('./db');

async function seedAdmin(){
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if(!email || !passwordHash){
    console.error('ADMIN_EMAIL / ADMIN_PASSWORD_HASH not set in .env — nothing to seed.');
    process.exit(1);
  }

  const existing = await pool.query('SELECT id FROM admin_account LIMIT 1');
  if(existing.rows.length > 0){
    console.log('admin_account already has a row — leaving it as-is.');
    await pool.end();
    return;
  }

  await pool.query(
    'INSERT INTO admin_account (email, password_hash) VALUES ($1, $2)',
    [email, passwordHash]
  );
  console.log(`Seeded admin_account with ${email} (using the existing password hash).`);
  await pool.end();
}

seedAdmin().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
