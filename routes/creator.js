const express = require('express');
const router = express.Router();
const controller = require('../controllers/creatorDashboardController');
const { requireRole } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { profileRules, portfolioRules } = require('../middleware/validators');

// Every route below needs a logged-in creator
router.use(requireRole('creator'));

router.get('/dashboard', controller.showDashboard);
router.post('/profile', uploadImage('avatar'), profileRules, controller.updateProfile);
router.post('/portfolio', uploadImage('image'), portfolioRules, controller.addWork);
router.post('/portfolio/:id/delete', controller.deleteWork);
router.post('/portfolio/:id/feature', controller.toggleFeatured);

module.exports = router;