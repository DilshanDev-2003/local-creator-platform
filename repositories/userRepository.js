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

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, role, is_active FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function listAll(limit) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, is_active,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_date
     FROM users
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// Admin accounts can NEVER be blocked (role <> 'admin' is inside the SQL), so an
// admin cannot lock themselves or other admins out.
async function setActive(id, active) {
  const [result] = await pool.query(
    "UPDATE users SET is_active = ? WHERE id = ? AND role <> 'admin'",
    [active ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

module.exports = { findByEmail, create, findById, listAll, setActive };