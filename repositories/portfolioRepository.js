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

module.exports = { findFeatured, findByCreator };