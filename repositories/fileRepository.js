const pool = require('../config/db');

async function save(filename, mimeType, data) {
  await pool.query(
    'INSERT INTO uploaded_files (filename, mime_type, data) VALUES (?, ?, ?)',
    [filename, mimeType, data]
  );
}

async function find(filename) {
  const [rows] = await pool.query(
    'SELECT mime_type, data FROM uploaded_files WHERE filename = ?',
    [filename]
  );
  return rows[0] || null;
}

async function remove(filename) {
  await pool.query('DELETE FROM uploaded_files WHERE filename = ?', [filename]);
}

module.exports = { save, find, remove };