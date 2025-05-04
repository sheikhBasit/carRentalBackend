const express = require('express');
const router = express.Router();
const {createBooking,cancelBooking ,completeBooking, getAllBookings,getBookingByUserId ,confirmBooking,getBookingByCompanyId, getBookingById , updateBooking , deleteBooking, softDeleteBooking, addAdminNote, deliverVehicle, returnVehicle} = require('../controllers/booking.controller');
const { verifyJWT } = require('../midllewares/auth.middleware');
const { bookingValidationRules, validate } = require('../utils/validate');

// Define booking routes
router.post('/postBooking', verifyJWT, bookingValidationRules(), validate, createBooking);
router.put('/confirm/:id', verifyJWT, confirmBooking );
router.patch('/cancelBooking/:id', verifyJWT, cancelBooking);
router.patch('/deliver/:id', verifyJWT, deliverVehicle);
router.patch('/return/:id', verifyJWT, returnVehicle);
router.get("/userBookings", verifyJWT, getBookingByUserId);
router.get("/companyBookings", verifyJWT, getBookingByCompanyId);
router.get('/getBooking', verifyJWT, getAllBookings);
router.get('/getBookingById/:id', verifyJWT, getBookingById);
router.patch('/updateBooking/:id', verifyJWT, updateBooking);
router.delete('/deleteBooking/:id', verifyJWT, deleteBooking);
router.patch('/completeBooking/:id', verifyJWT, completeBooking);
// Soft delete/restore booking (admin/company)
router.patch('/:id/soft-delete', verifyJWT, softDeleteBooking);
// Add admin/company note
router.patch('/:id/admin-note', verifyJWT, addAdminNote);

module.exports = router;
