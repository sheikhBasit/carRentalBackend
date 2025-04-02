// routes/paymentRoutes.js
const express = require("express");
const PaymentController = require("../controllers/payment.controller");
const router = express.Router();

// Create a payment intent
router.post("/create-payment-intent", PaymentController.createPaymentIntent);

// Confirm payment and save payment details
router.post("/confirm-payment", PaymentController.confirmPayment);

// Get payment details by booking ID
router.get("/payment-details/:bookingId", PaymentController.getPaymentDetails);

module.exports = router;