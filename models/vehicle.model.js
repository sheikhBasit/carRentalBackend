const mongoose = require('mongoose');
const { Schema } = mongoose;
const mongooseAggregatePaginate = require("mongoose-aggregate-paginate-v2");

const availabilitySchema = new Schema({
  days: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: { type: String, required: true }, // Format: "HH:MM"
  endTime: { type: String, required: true }   // Format: "HH:MM"
});

const citySchema = new Schema({
  name: { type: String, required: true },
  additionalFee: { type: Number, default: 0 }
});

const vehicleSchema = new mongoose.Schema({
  company: { 
    type: Schema.Types.ObjectId,
    ref: "RentalCompany",
    required: true 
  },
  manufacturer: { type: String, required: true, lowercase: true },
  model: { type: String, required: true, lowercase: true },
  numberPlate: { type: String, required: true, unique: true },
  carImageUrls: [{ type: String, unique: false }],
  trips: { type: Number, default: 0 },
  rent: { type: Number, required: true },
  capacity: { type: Number, required: true },
  transmission: { type: String, enum: ['Auto', 'Manual'], required: true },
  availability: availabilitySchema,
  cities: [citySchema],
  isAvailable: { type: Boolean, default: true },
  bookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  }]
}, {
  timestamps: true
});

vehicleSchema.plugin(mongooseAggregatePaginate);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;