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

// Inserts the review ONLY IF the commission belongs to this client and is completed.
// One atomic statement: the checks and the insert cannot be separated by a race.
// Returns true if saved, false if not allowed. A second review for the same
// commission fails on the UNIQUE(commission_id) key (ER_DUP_ENTRY).
async function create({ commissionId, clientId, rating, comment }) {
  const [result] = await pool.query(
    `INSERT INTO reviews (commission_id, rating, comment)
     SELECT cr.id, ?, ?
     FROM commission_requests cr
     WHERE cr.id = ? AND cr.client_id = ? AND cr.status = 'completed'`,
    [rating, comment, commissionId, clientId]
  );
  return result.affectedRows > 0;
}

module.exports = { findLatestVisible, findByCreator, create };