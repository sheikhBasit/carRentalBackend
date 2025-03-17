const express = require('express');
const {createBooking , getAllBookings,getBookingByUserId ,getBookingByCompanyId, getBookingById , updateBooking , deleteBooking} = require('../controllers/booking.controller');
const router = express.Router();

// Define booking routes
router.post('/postBooking', createBooking);
router.get("/userBookings", getBookingByUserId);
router.get("/companyBookings", getBookingByCompanyId);
router.get('/getBooking', getAllBookings);
router.get('/getBookingById/:id', getBookingById);
router.patch('/updateBooking/:id', updateBooking);
router.delete('/deleteBooking/:id', deleteBooking);

module.exports = router;
