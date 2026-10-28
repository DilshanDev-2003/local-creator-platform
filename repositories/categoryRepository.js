const pool = require('../config/db');

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
}

// All categories with the number of APPROVED creators in each
async function findAllWithCount() {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(cp.id) AS creator_count
     FROM categories c
     LEFT JOIN creator_profiles cp
       ON cp.category_id = c.id AND cp.is_approved = 1
     GROUP BY c.id
     ORDER BY c.name`
  );
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
  return rows[0] || null;
}

module.exports = { findAll, findById, findAllWithCount, findBySlug };