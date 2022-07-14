const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// TODO: Avoid evil regular expressions - taking exponential time to evaluate
// TODO: Blacklist of untrusted tokens that are validated on each request
// TODO: Confirm user's email on registration
// TODO: Refresh JWT tokens - removes the need for user to log in after token has expired
// TODO: 2FA Auth

// Authentication is not consistent with REST principles
// Not relying only on verbs to perform actions but the actual path signifies the action
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

// !!!
// The router itself is a middleware. Middlewares run is sequence.
// All routes below this will be going through the .protect() function
// Before their actual implementation. Pretty narly
// !!!
router.use(authController.protect);

router.route('/updateMyPassword').patch(authController.updateMyPassword);

router.get('/me', authController.getMe, userController.getUser);
router.route('/updateMe').patch(userController.updateMe);
router.route('/deleteMe').delete(userController.deleteMe);

// Admin access
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
