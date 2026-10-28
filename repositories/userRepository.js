const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

// Creates the user. If the role is 'creator', also creates an (unapproved)
// creator profile. Both inserts succeed together or fail together.
async function create({ name, email, passwordHash, role, categoryId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );
    const userId = result.insertId;

    if (role === 'creator') {
      await conn.query(
        'INSERT INTO creator_profiles (user_id, category_id) VALUES (?, ?)',
        [userId, categoryId]
      );
    }

    await conn.commit();
    return userId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findByEmail, create };