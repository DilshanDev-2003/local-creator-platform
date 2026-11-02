const pool = require('../config/db');

// "To become X, the request must currently be Y". This is the whole state machine.
const REQUIRED_CURRENT_STATUS = {
  accepted: 'pending',
  rejected: 'pending',
  completed: 'accepted',
};

async function create({ clientId, creatorId, title, description, budget, deadline }) {
  const [result] = await pool.query(
    `INSERT INTO commission_requests
       (client_id, creator_id, title, description, budget, deadline)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clientId, creatorId, title, description, budget, deadline]
  );
  return result.insertId;
}

// Does this client already have an open (pending) request with this creator?
async function hasPending(clientId, creatorId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM commission_requests
     WHERE client_id = ? AND creator_id = ? AND status = 'pending' LIMIT 1`,
    [clientId, creatorId]
  );
  return rows.length > 0;
}

async function findByClient(clientId) {
  const [rows] = await pool.query(
    `SELECT cr.id, cr.title, cr.description, cr.budget, cr.status,
            DATE_FORMAT(cr.deadline, '%Y-%m-%d')   AS deadline,
            DATE_FORMAT(cr.created_at, '%Y-%m-%d') AS created_date,
            cp.id AS creator_profile_id, cu.name AS creator_name,
            CASE WHEN cr.status IN ('accepted', 'completed') THEN cu.email END AS contact_email,
            rv.id AS review_id, rv.rating AS review_rating, rv.comment AS review_comment
     FROM commission_requests cr
     JOIN creator_profiles cp ON cp.id = cr.creator_id
     JOIN users cu            ON cu.id = cp.user_id
     LEFT JOIN reviews rv     ON rv.commission_id = cr.id
     WHERE cr.client_id = ?
     ORDER BY cr.created_at DESC`,
    [clientId]
  );
  return rows;
}

// A creator's incoming requests (open ones first). The client's email only after accepting.
async function findByCreator(creatorProfileId) {
  const [rows] = await pool.query(
    `SELECT cr.id, cr.title, cr.description, cr.budget, cr.status,
            DATE_FORMAT(cr.deadline, '%Y-%m-%d')   AS deadline,
            DATE_FORMAT(cr.created_at, '%Y-%m-%d') AS created_date,
            cl.name AS client_name,
            CASE WHEN cr.status IN ('accepted', 'completed') THEN cl.email END AS contact_email
     FROM commission_requests cr
     JOIN users cl ON cl.id = cr.client_id
     WHERE cr.creator_id = ?
     ORDER BY FIELD(cr.status, 'pending', 'accepted', 'completed', 'rejected'),
              cr.created_at DESC`,
    [creatorProfileId]
  );
  return rows;
}

// Changes the status only if the request belongs to this creator AND is in the
// right current status. One atomic UPDATE, so double-clicks and races are safe.
async function updateStatus(id, creatorProfileId, newStatus) {
  const required = REQUIRED_CURRENT_STATUS[newStatus];
  if (!required) return false;

  const [result] = await pool.query(
    `UPDATE commission_requests SET status = ?
     WHERE id = ? AND creator_id = ? AND status = ?`,
    [newStatus, id, creatorProfileId, required]
  );
  return result.affectedRows > 0;
}

module.exports = { create, hasPending, findByClient, findByCreator, updateStatus };