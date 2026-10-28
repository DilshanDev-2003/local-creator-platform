const { body } = require('express-validator');

const registerRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters.'),
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Enter a valid email address.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match.'),
  // 'admin' is deliberately NOT allowed here
  body('role')
    .isIn(['visitor', 'creator'])
    .withMessage('Choose a valid account type.'),
  body('categoryId')
    .if(body('role').equals('creator'))
    .isInt({ min: 1 })
    .withMessage('Creators must choose a category.'),
];

const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Enter your password.'),
];

module.exports = { registerRules, loginRules };