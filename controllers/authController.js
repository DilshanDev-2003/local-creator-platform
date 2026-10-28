const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const userRepository = require('../repositories/userRepository');
const categoryRepository = require('../repositories/categoryRepository');

async function showRegister(req, res) {
  const categories = await categoryRepository.findAll();
  res.render('register', { errors: [], old: {}, categories });
}

async function register(req, res) {
  const categories = await categoryRepository.findAll();
  const old = req.body;

  // 1. Validation errors from express-validator
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => e.msg);
    return res.status(400).render('register', { errors, old, categories });
  }

  const { name, email, password, role, categoryId } = req.body;

  try {
    // 2. Creator must pick a category that really exists
    if (role === 'creator') {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        return res
          .status(400)
          .render('register', { errors: ['Selected category does not exist.'], old, categories });
      }
    }

    // 3. Hash the password, never store plain text
    const passwordHash = await bcrypt.hash(password, 10);
    await userRepository.create({ name, email, passwordHash, role, categoryId });

    res.redirect('/login?registered=1');
  } catch (err) {
    // Duplicate email (UNIQUE constraint)
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .render('register', { errors: ['This email is already registered.'], old, categories });
    }
    console.error(err);
    res.status(500).render('register', {
      errors: ['Something went wrong. Please try again.'],
      old,
      categories,
    });
  }
}

function showLogin(req, res) {
  res.render('login', {
    errors: [],
    old: {},
    success: req.query.registered ? 'Account created. You can log in now.' : null,
  });
}

async function login(req, res) {
  const old = req.body;
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => e.msg);
    return res.status(400).render('login', { errors, old, success: null });
  }

  const { email, password } = req.body;
  // One generic message for every failure, so attackers can't tell which emails exist
  const invalid = () =>
    res.status(401).render('login', { errors: ['Invalid email or password.'], old, success: null });

  try {
    const user = await userRepository.findByEmail(email);
    if (!user) return invalid();

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return invalid();

    if (!user.is_active) {
      return res
        .status(403)
        .render('login', { errors: ['This account has been blocked.'], old, success: null });
    }

    // Regenerate the session ID on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.user = { id: user.id, name: user.name, role: user.role };
      req.session.save(() => res.redirect('/'));
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('login', {
      errors: ['Something went wrong. Please try again.'],
      old,
      success: null,
    });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

module.exports = { showRegister, register, showLogin, login, logout };