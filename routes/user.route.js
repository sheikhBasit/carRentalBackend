const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../midllewares/fileUpload.middleware');
const { verifyToken, authorizeRoles } = require('../midllewares/verifyToken');

// ================== AUTHENTICATION ROUTES ================== //
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
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/verify-email', userController.verifyEmail);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);
router.get('/check-auth', verifyToken, userController.checkAuth);

// ================== USER MANAGEMENT ROUTES ================== //
router.get('/all', verifyToken, authorizeRoles(['admin']), userController.getAllUsers);
router.get('/:id', verifyToken, userController.getUserById);
router.put('/:id', verifyToken, userController.updateUser);
router.delete('/:id', verifyToken, userController.deleteUser);

// ================== HOST-SPECIFIC ROUTES ================== //
router.get('/hosts', verifyToken, authorizeRoles(['admin']), userController.getAllHosts);
router.get('/hosts/:hostId', verifyToken, authorizeRoles(['admin']), userController.getHostById);
router.get('/hosts/profile/me', verifyToken, authorizeRoles(['host']), userController.getHostProfile);
router.put(
  '/hosts/profile/me',
  verifyToken,
  authorizeRoles(['host']),
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "cnicFront", maxCount: 1 },
    { name: "cnicBack", maxCount: 1 },
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
  ]),
  userController.updateHostProfile
);

// ================== PAYMENT METHOD ROUTES ================== //
router.post('/:userId/payment-methods', verifyToken, userController.addPaymentMethod);
router.get('/:userId/payment-methods', verifyToken, userController.getPaymentMethods);
router.patch('/:userId/payment-methods/:paymentMethodId/set-default', verifyToken, userController.setDefaultPaymentMethod);
router.delete('/:userId/payment-methods/:paymentMethodId', verifyToken, userController.removePaymentMethod);

// ================== ADMIN MANAGEMENT ROUTES ================== //
router.patch('/:userId/role', verifyToken, authorizeRoles(['admin']), userController.changeUserRole);
router.patch('/:userId/block', verifyToken, authorizeRoles(['admin']), userController.setUserBlocked);
router.patch('/:userId/notification-preferences', verifyToken, userController.updateNotificationPreferences);
router.patch('/:userId/two-factor', verifyToken, userController.toggleTwoFactor);
router.patch('/:userId/verify-doc', verifyToken, authorizeRoles(['admin', 'company']), userController.verifyUserDocument);

module.exports = router;