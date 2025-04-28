// controllers/PaymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY ); // Replace with your Stripe secret key  || ''
const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");


// In your backend (Node.js)
exports.createPaymentIntent = async (req, res) => {
  const { amount, currency = "usd", bookingId } = req.body;

  try {
    // 1. Validate input
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ 
        error: "Invalid amount" 
      });
    }

    // 2. Create customer (if needed)
    const customer = await stripe.customers.create();

    // 3. Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // in cents
      currency,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { bookingId: bookingId || 'none' }
    });

    // 4. Create ephemeral key
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-08-16' }
    );

    // 5. Return all needed data
    res.json({
      clientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error("Backend payment error:", error);
    res.status(500).json({ 
      error: error.message || "Payment processing failed" 
    });
  }
};
exports.confirmPayment = async (req, res) => {
  const { paymentIntentId, bookingId, userId } = req.body;

  try {
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    // Save payment record
    const payment = new Payment({
      userId,
      bookingId,
      amount: paymentIntent.amount / 100, // Convert back to dollars
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method_types[0],
      paymentStatus: paymentIntent.status,
      transactionId: paymentIntent.id,
    });

    await payment.save();

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, { 
      status: "confirmed",
      paymentStatus: "paid" 
    });

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      payment
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
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