const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

// One line protects EVERY admin route
router.use(requireRole('admin'));

router.get('/', controller.showDashboard);

router.post('/creators/:id/approve', controller.approveCreator);
router.post('/creators/:id/revoke', controller.revokeCreator);
router.post('/users/:id/block', controller.blockUser);
router.post('/users/:id/unblock', controller.unblockUser);
router.post('/reviews/:id/hide', controller.hideReview);
router.post('/reviews/:id/show', controller.showReview);

module.exports = router;