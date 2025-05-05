const express = require('express');
const router = express.Router();
const {createBooking,cancelBooking ,completeBooking, getAllBookings,getBookingByUserId ,confirmBooking,getBookingByCompanyId, getBookingById , updateBooking , deleteBooking, softDeleteBooking, addAdminNote, deliverVehicle, returnVehicle} = require('../controllers/booking.controller');
const { verifyToken } = require('../midllewares/verifyToken');
const { bookingValidationRules, validate } = require('../utils/validate');

// Define booking routes
router.post('/postBooking', verifyToken, bookingValidationRules(), validate, createBooking);
router.put('/confirm/:id', verifyToken, confirmBooking );
router.patch('/cancelBooking/:id', verifyToken, cancelBooking);
router.patch('/deliver/:id', verifyToken, deliverVehicle);
router.patch('/return/:id', verifyToken, returnVehicle);
router.get("/userBookings", verifyToken, getBookingByUserId);
router.get("/companyBookings", verifyToken, getBookingByCompanyId);
router.get('/getBooking', verifyToken, getAllBookings);
router.get('/getBookingById/:id', verifyToken, getBookingById);
router.patch('/updateBooking/:id', verifyToken, updateBooking);
router.delete('/deleteBooking/:id', verifyToken, deleteBooking);
router.patch('/completeBooking/:id', verifyToken, completeBooking);
// Soft delete/restore booking (admin/company)
router.patch('/:id/soft-delete', verifyToken, softDeleteBooking);
// Add admin/company note
router.patch('/:id/admin-note', verifyToken, addAdminNote);

module.exports = router;
