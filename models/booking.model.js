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
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;