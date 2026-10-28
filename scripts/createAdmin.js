// Usage: node scripts/createAdmin.js admin@example.com YourStrongPassword
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.log('Usage: node scripts/createAdmin.js <email> <password (min 8 chars)>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', ?, ?, 'admin')",
      [email.toLowerCase(), hash]
    );
    console.log('Admin created:', email);
  } catch (err) {
    console.log(err.code === 'ER_DUP_ENTRY' ? 'That email already exists.' : err.message);
  }
  await pool.end();
}

main();