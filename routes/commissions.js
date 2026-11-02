const express = require('express');
const router = express.Router();
const controller = require('../controllers/commissionController');
const { requireRole } = require('../middleware/auth');
const { commissionRules } = require('../middleware/validators');

// Visitors and creators can be clients. Admins cannot.
const clients = requireRole('visitor', 'creator');

router.get('/my-commissions', clients, controller.listMine);
router.post('/commissions', clients, commissionRules, controller.create);

module.exports = router;