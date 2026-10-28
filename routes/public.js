const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const categoryController = require('../controllers/categoryController');
const creatorController = require('../controllers/creatorController');

router.get('/', homeController.showHome);

router.get('/categories', categoryController.list);
router.get('/categories/:slug', categoryController.show);

router.get('/creators', creatorController.list);
router.get('/creators/:id', creatorController.show);

module.exports = router;