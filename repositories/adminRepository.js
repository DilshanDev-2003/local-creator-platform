const pool = require('../config/db');

// Counts for the dashboard cards, in ONE query
async function getStats() {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users)                                        AS users,
       (SELECT COUNT(*) FROM creator_profiles WHERE is_approved = 1)       AS creators,
       (SELECT COUNT(*) FROM creator_profiles WHERE is_approved = 0)       AS pending_creators,
       (SELECT COUNT(*) FROM commission_requests)                          AS commissions,
       (SELECT COUNT(*) FROM reviews)                                      AS reviews`
  );
  return rows[0];
}

module.exports = { getStats };