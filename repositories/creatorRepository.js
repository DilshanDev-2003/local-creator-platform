const pool = require('../config/db');

// Shared pieces so the list, search and single-creator queries stay consistent.
const SELECT_CREATOR = `
  SELECT cp.id, cp.user_id, u.name, cp.bio, cp.location, cp.avatar_path,
         c.name AS category_name, c.slug AS category_slug,
         ROUND(AVG(r.rating), 1) AS avg_rating,
         COUNT(r.id) AS review_count
  FROM creator_profiles cp
  JOIN users u      ON u.id = cp.user_id AND u.is_active = 1
  JOIN categories c ON c.id = cp.category_id
  LEFT JOIN commission_requests cr ON cr.creator_id = cp.id
  LEFT JOIN reviews r ON r.commission_id = cr.id AND r.is_visible = 1`;

const GROUP_BY = `
  GROUP BY cp.id, cp.user_id, u.name, cp.bio, cp.location,
           cp.avatar_path, c.name, c.slug`;

// Approved creators, optionally filtered by category slug and/or location text.
async function search({ categorySlug, location, limit = 50 } = {}) {
  const where = ['cp.is_approved = 1'];
  const params = [];

  if (categorySlug) {
    where.push('c.slug = ?');
    params.push(categorySlug);
  }
  if (location) {
    // Escape LIKE wildcards so "%" typed by a user is treated as plain text
    const safe = location.replace(/[\\%_]/g, '\\$&');
    where.push('cp.location LIKE ?');
    params.push(`%${safe}%`);
  }
  params.push(limit);

  const [rows] = await pool.query(
    `${SELECT_CREATOR}
     WHERE ${where.join(' AND ')}
     ${GROUP_BY}
     ORDER BY avg_rating DESC, review_count DESC, cp.created_at DESC
     LIMIT ?`,
    params
  );
  return rows;
}

// Used by the homepage
async function findTopRated(limit) {
  return search({ limit });
}

// One approved creator (null if missing, unapproved or blocked)
async function findById(id) {
  const [rows] = await pool.query(
    `${SELECT_CREATOR}
     WHERE cp.id = ? AND cp.is_approved = 1
     ${GROUP_BY}`,
    [id]
  );
  return rows[0] || null;
}

// The logged-in creator's own profile (approved or not)
async function findByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT cp.id, cp.user_id, cp.bio, cp.location, cp.avatar_path, cp.is_approved,
            c.name AS category_name
     FROM creator_profiles cp
     JOIN categories c ON c.id = cp.category_id
     WHERE cp.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

// avatarPath = null keeps the existing avatar (COALESCE)
async function updateProfile(userId, { bio, location, avatarPath }) {
  await pool.query(
    `UPDATE creator_profiles
     SET bio = ?, location = ?, avatar_path = COALESCE(?, avatar_path)
     WHERE user_id = ?`,
    [bio || null, location || null, avatarPath || null, userId]
  );
}

module.exports = { search, findTopRated, findById, findByUserId, updateProfile };