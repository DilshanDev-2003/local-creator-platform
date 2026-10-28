const pool = require('../config/db');

// Featured works from approved creators, for the homepage carousel.
async function findFeatured(limit) {
  const [rows] = await pool.query(
    `SELECT pi.id, pi.title, pi.image_path,
            cp.id AS creator_id, u.name AS creator_name
     FROM portfolio_items pi
     JOIN creator_profiles cp ON cp.id = pi.creator_id AND cp.is_approved = 1
     JOIN users u             ON u.id = cp.user_id AND u.is_active = 1
     WHERE pi.is_featured = 1
     ORDER BY pi.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function findByCreator(creatorId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, image_path, is_featured, created_at
     FROM portfolio_items
     WHERE creator_id = ?
     ORDER BY created_at DESC`,
    [creatorId]
  );
  return rows;
}

async function countByCreator(creatorId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM portfolio_items WHERE creator_id = ?',
    [creatorId]
  );
  return rows[0].total;
}

async function create({ creatorId, title, description, imagePath, isFeatured }) {
  const [result] = await pool.query(
    `INSERT INTO portfolio_items (creator_id, title, description, image_path, is_featured)
     VALUES (?, ?, ?, ?, ?)`,
    [creatorId, title, description || null, imagePath, isFeatured ? 1 : 0]
  );
  return result.insertId;
}

// Deletes ONLY if the item belongs to this creator. Returns the image file name
// (so the file can be removed too), or null if nothing matched.
async function deleteOwned(id, creatorId) {
  const [rows] = await pool.query(
    'SELECT image_path FROM portfolio_items WHERE id = ? AND creator_id = ?',
    [id, creatorId]
  );
  if (!rows[0]) return null;
  await pool.query('DELETE FROM portfolio_items WHERE id = ? AND creator_id = ?', [id, creatorId]);
  return rows[0].image_path;
}

// Flips is_featured, again ONLY for the owner's item
async function toggleFeatured(id, creatorId) {
  const [result] = await pool.query(
    'UPDATE portfolio_items SET is_featured = 1 - is_featured WHERE id = ? AND creator_id = ?',
    [id, creatorId]
  );
  return result.affectedRows > 0;
}

module.exports = { findFeatured, findByCreator, countByCreator, create, deleteOwned, toggleFeatured };