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
    { name: "profilePic", maxCount: 1 }
  ]),
  (req, res, next) => {
    try {
      // Debugging 1: Log incoming request info
      console.log('===== UPLOAD DEBUG START =====');
      console.log('Request Headers:', req.headers);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Request Body Keys:', Object.keys(req.body));
      
      // Debugging 2: Verify files were processed by multer
      if (!req.files) {
        console.warn('No files detected in request');
        return res.status(400).json({ error: 'No files uploaded' });
      }

      console.log('Files received:', Object.keys(req.files));
      
      // Debugging 3: Check each file individually
      const fileFields = ['cnicFront', 'cnicBack', 'licenseFront', 'licenseBack', 'profilePic'];
      fileFields.forEach(field => {
        if (req.files[field]) {
          console.log(`Field ${field}:`, {
            originalname: req.files[field][0].originalname,
            mimetype: req.files[field][0].mimetype,
            size: req.files[field][0].size,
            path: req.files[field][0].path // Check where multer stored it
          });
        } else {
          console.warn(`Missing expected file field: ${field}`);
        }
      });

      // Debugging 4: Verify temp directory exists (if using disk storage)
      // if (upload.storage === multer.diskStorage) {
      //   const tempDir = './public/temp';
      //   try {
      //     const files = fs.readdirSync(tempDir);
      //     console.log(`Temp directory (${tempDir}) contains:`, files);
      //   } catch (err) {
      //     console.error(`Temp directory error: ${err.message}`);
      //   }
      // }

      console.log('===== UPLOAD DEBUG END =====');
      
      // Proceed to controller
      next();
    } catch (debugError) {
      console.error('Debug middleware error:', debugError);
      next(debugError);
    }
  },
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

// Verify email
router.post('/verify-email', userController.verifyEmail);

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

module.exports = router;
