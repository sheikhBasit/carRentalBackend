// routes/transactionBookingRoutes.js

const express = require('express');
const router = express.Router();
const transactionBookingController = require('../controllers/transaction.controller.js');

// Create new TransactionBooking
router.post('/post', transactionBookingController.createTransactionBooking);


router.get('/booking/:bookingId', transactionBookingController.getTransactionByBookingId);

// Get all TransactionBookings
router.get('/', transactionBookingController.getAllTransactionBookings);

// Get transactions for a specific company
router.get('/company/:companyId', transactionBookingController.getTransactionsByCompany);

// Get a single TransactionBooking by ID
router.get('/:id', transactionBookingController.getTransactionBookingById);

// Update a TransactionBooking
router.put('/:id', transactionBookingController.updateTransactionBooking);

// Delete a TransactionBooking
router.delete('/:id', transactionBookingController.deleteTransactionBooking);

module.exports = router;
