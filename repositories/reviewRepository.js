const pool = require('../config/db');

// Latest visible reviews, with client and creator names.
async function findLatestVisible(limit) {
  const [rows] = await pool.query(
    `SELECT r.rating, r.comment, r.created_at,
            client.name AS client_name,
            creator_user.name AS creator_name
     FROM reviews r
     JOIN commission_requests cr ON cr.id = r.commission_id
     JOIN users client           ON client.id = cr.client_id
     JOIN creator_profiles cp    ON cp.id = cr.creator_id
     JOIN users creator_user     ON creator_user.id = cp.user_id
     WHERE r.is_visible = 1
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function findByCreator(creatorId) {
  const [rows] = await pool.query(
    `SELECT r.rating, r.comment, r.created_at, client.name AS client_name
     FROM reviews r
     JOIN commission_requests cr ON cr.id = r.commission_id
     JOIN users client           ON client.id = cr.client_id
     WHERE cr.creator_id = ? AND r.is_visible = 1
     ORDER BY r.created_at DESC`,
    [creatorId]
  );
  return rows;
}

module.exports = { findLatestVisible, findByCreator };