require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pool = require('./config/db');

const app = express();

// View engine: EJS renders HTML pages on the server
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: false })); // read HTML form data
app.use(express.static(path.join(__dirname, 'public'))); // serve css/js/images
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 }, // 2 hours
  })
);

// Make the logged-in user available in every EJS view
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/public'));

// Any URL not matched above lands here (must stay AFTER all routes)
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page not found' });
});

app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM categories');
    res.json({ status: 'ok', categories: rows[0].total });
  } catch (err) {
    res.status(500).json({ status: 'database error', message: err.message });
  }
});

module.exports = app;