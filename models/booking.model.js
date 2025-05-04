const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    idVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true }, // Vehicle reference
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // User reference
    company: { type: Schema.Types.ObjectId, ref: 'RentalCompany', required: true }, // Rental company reference
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', default: null }, // Optional driver reference
    from: { type: String, required: true }, // Start location
    to: { type: String, required: true }, // End location
    fromTime: { type: String, required: true }, // Start time
    toTime: { type: String, required: true }, // End time
    intercity: { type: Boolean, required: true }, // True for intercity, False for intracity
    cityName: { type: String, required: false, lowercase: true  }, // City name of booking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'ongoing', 'completed', 'canceled'],
      default: 'pending',
    }, // Status of the booking
    bufferMinutes: { type: Number, default: 120 }, // 2 hours buffer between bookings
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate',
    },
    refundAmount: { type: Number, default: 0 },
    termsAccepted: { type: Boolean, required: true },
    priceDetails: {
      base: { type: Number, min: 0, default: 0 },
      discount: { type: Number, min: 0, default: 0 },
      tax: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, default: 0 },
    },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    cancellationReason: { type: String },
    feedback: [{ type: Schema.Types.ObjectId, ref: 'Feedback' }],
    damageReports: [{ type: Schema.Types.ObjectId, ref: 'DamageReport' }],
    isDeleted: { type: Boolean, default: false },
    adminNotes: { type: String },
    bookingChannel: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
    promoCode: { type: String },
    handoverAt: { type: Date },
    returnedAt: { type: Date },
    deliveryReminderSent: { type: Boolean, default: false },
    returnReminderSent: { type: Boolean, default: false },
    overdueNotified: { type: Boolean, default: false },
    auditLogs: [{
      action: String,
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
      details: String
    }],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;