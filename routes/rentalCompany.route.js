const express = require('express');
const router = express.Router();
const rentalCompanyController = require('../controllers/rentalCompany.controller'); // Ensure correct import

const upload = require('../midllewares/fileUpload.middleware.js'); // If using file upload middleware

// Ensure all functions are defined in the controller
router.post('/postRental', upload.fields([{ name: "cnicFront", maxCount: 1 }, { name: "cnicBack", maxCount: 1 }]), rentalCompanyController.createRentalCompany);
router.post('/login', rentalCompanyController.getRentalCompanyByEmail);
router.get('/getRental', rentalCompanyController.getAllRentalCompanies);
router.get('/:id', rentalCompanyController.getRentalCompanyById);
router.put('/:id', rentalCompanyController.updateRentalCompany);
router.delete('/:id', rentalCompanyController.deleteRentalCompany);
router.post('/verify/rental-company', rentalCompanyController.verifyEmail);
router.post('/resend-verification/rental-company', rentalCompanyController.resendVerification);
module.exports = router;
