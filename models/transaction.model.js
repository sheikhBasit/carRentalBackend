// models/TransactionBooking.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionBookingSchema = new Schema({
  transactionId: { type: String, required: true },    // Payment transaction id
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true }, // Reference to Booking

  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  
  // Optional details
  paymentMethod: { type: String }, // card, cash, etc.
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TransactionBooking', TransactionBookingSchema);
