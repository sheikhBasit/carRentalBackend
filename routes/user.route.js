const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');

// Create a new user (with file upload)
router.post(
  '/create',
  upload.fields([
    { name: "cnicFront", maxCount: 1 },
    { name: "cnicBack", maxCount: 1 },
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
    { name: "profilePic", maxCount: 1 },
  ]),
  userController.createUser
);

// Get all users
router.get('/all', userController.getAllUsers);

// Verify email
router.post('/verify-email', userController.verifyEmail);

// Get a single user by ID
router.get('/:id', userController.getUserById);

// Update user details
router.put('/:id', userController.updateUser);

// Delete a user
router.delete('/:id', userController.deleteUser);

// User login
router.post('/login', userController.login);

// User logout
router.post('/logout', userController.logout);

// Forgot password (send reset link)
router.post('/forgot-password', userController.forgotPassword);

// Reset password
router.post('/reset-password/:token', userController.resetPassword);

// Check authentication
router.get('/check-auth', userController.checkAuth);

// --- RBAC, Admin, Company, User Management Extensions ---
const {
  changeUserRole,
  setUserBlocked,
  updateNotificationPreferences,
  toggleTwoFactor,
  verifyUserDocument
} = require('../controllers/user.controller.js');

// Change user role (admin only)
router.patch('/:userId/role', changeUserRole);
// Block/unblock user (admin only)
router.patch('/:userId/block', setUserBlocked);
// Update notification preferences
router.patch('/:userId/notification-preferences', updateNotificationPreferences);
// Toggle two-factor auth
router.patch('/:userId/two-factor', toggleTwoFactor);
// Verify CNIC/license (admin/company)
router.patch('/:userId/verify-doc', verifyUserDocument);

router.post('/:userId/payment-methods', userController.addPaymentMethod);
router.get('/:userId/payment-methods', userController.getPaymentMethods);
router.patch('/:userId/payment-methods/:paymentMethodId/set-default', userController.setDefaultPaymentMethod);
router.delete('/:userId/payment-methods/:paymentMethodId', userController.removePaymentMethod);

module.exports = router;
