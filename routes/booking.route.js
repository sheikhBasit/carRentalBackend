const express = require('express');
const router = express.Router();
const {createBooking,cancelBooking , getAllBookings,getBookingByUserId ,confirmBooking,getBookingByCompanyId, getBookingById , updateBooking , deleteBooking} = require('../controllers/booking.controller');

// Define booking routes
router.post('/postBooking', createBooking);
router.put('/confirm/:bookingId',confirmBooking );
router.patch('/cancelBooking/:bookingId', cancelBooking);
router.get("/userBookings", getBookingByUserId);
router.get("/companyBookings", getBookingByCompanyId);
router.get('/getBooking', getAllBookings);
router.get('/getBookingById/:id', getBookingById);
router.patch('/updateBooking/:id', updateBooking);
router.delete('/deleteBooking/:id', deleteBooking);
router.patch('/completeBooking/:bookingId', completeBooking);

module.exports = router;
