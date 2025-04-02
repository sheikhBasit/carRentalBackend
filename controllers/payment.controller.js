// controllers/PaymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51QGDbHC1170CwYd9M2SqpIfMBmHtPnYLPV7HK0YtATv01RmsOGws8NY3Bs4wCIsTg4KCAx7AWQQ0dYlpEKZ1xE7t004uV8UF2x'); // Replace with your Stripe secret key
const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");

// Create a payment intent
exports.createPaymentIntent = async (req, res) => {
  const { bookingId, amount, currency } = req.body;

  try {
    // Create a payment intent using Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency || "usd",
      metadata: { bookingId },
    });

    // Return the client secret for the payment intent
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
    });
  }
};

// Confirm payment and save payment details
exports.confirmPayment = async (req, res) => {
  const { paymentIntentId, bookingId, userId, amount, paymentMethod } = req.body;

  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
      });
    }

    // Save payment details to the database
    const payment = new Payment({
      userId,
      bookingId,
      amount,
      currency: paymentIntent.currency,
      paymentMethod,
      paymentStatus: paymentIntent.status,
      transactionId: paymentIntent.id,
    });

    await payment.save();

    // Update the booking status to "paid"
    await Booking.findByIdAndUpdate(bookingId, { status: "paid" });

    res.status(200).json({
      success: true,
      message: "Payment confirmed and saved successfully",
      payment,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
    });
  }
};

// Get payment details by booking ID
exports.getPaymentDetails = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const payment = await Payment.findOne({ bookingId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
    });
  }
};