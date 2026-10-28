const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerRules, loginRules } = require('../middleware/validators');
const { redirectIfLoggedIn } = require('../middleware/auth');

router.get('/register', redirectIfLoggedIn, authController.showRegister);
router.post('/register', redirectIfLoggedIn, registerRules, authController.register);

router.get('/login', redirectIfLoggedIn, authController.showLogin);
router.post('/login', redirectIfLoggedIn, loginRules, authController.login);

// POST (not GET) so a random link or image can't log users out
router.post('/logout', authController.logout);

module.exports = router;