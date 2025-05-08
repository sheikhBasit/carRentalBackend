const mongoose = require('mongoose');
const { Schema } = mongoose;
const mongooseAggregatePaginate = require("mongoose-aggregate-paginate-v2");

const availabilitySchema = new Schema({
  days: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
  },
  endTime: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
  }
});

const citySchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  additionalFee: { 
    type: Number, 
    default: 0,
    min: 0 
  }
});

const vehicleSchema = new mongoose.Schema({
  company: { 
    type: Schema.Types.ObjectId,
    ref: "RentalCompany",
    required: true 
  },
  manufacturer: { 
    type: String, 
    required: true, 
    trim: true,
    lowercase: true 
  },
  model: { 
    type: String, 
    required: true, 
    trim: true,
    lowercase: true 
  },
  year: { 
    type: Number, 
    required: true,
    min: 1990,
    max: new Date().getFullYear() + 1
  },
  numberPlate: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true 
  },
  vin: { type: String },
  carImageUrls: [{ 
    type: String, 
    trim: true 
  }],
  images: [{ type: String }], // Array of image URLs
  trips: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  rent: { 
    type: Number, 
    required: true,
    min: 0 
  },
  capacity: { 
    type: Number, 
    required: false,
    min: 1,
    max: 20 
  },
  transmission: { type: String, enum: ['automatic', 'manual','Auto','Manual'], required: false },

  features: {
    transmission: { type: String, enum: ['automatic', 'manual'], required: false },
    fuelType: { type: String, enum: ['petrol', 'diesel', 'hybrid', 'electric'], required: false },
    seats: { type: Number, min: 2, max: 15, required: false },
    luggage: { type: Number, min: 0, max: 10 },
    ac: { type: Boolean, default: false },
    bluetooth: { type: Boolean, default: false },
    gps: { type: Boolean, default: false }
  },
  mileage: { 
    type: Number,
    min: 0 
  },
  lastServiceDate: { 
    type: Date,
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Last service date cannot be in the future'
    } 
  },
  insurance: {
    policyNumber: { type: String },
    provider: { type: String },
    documentUrl: { type: String },
    expiry: { 
      type: Date,
      required: false 
    }
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'under_maintenance', 'inactive'],
    default: 'available',
    required: false
  },
  maintenanceLogs: [{
    date: { type: Date, required: false },
    description: { type: String, required: false },
    cost: { type: Number, min: 0 }
  }],
  dynamicPricing: {
    baseRate: { type: Number, min: 0, default: 0 },
    weekendRate: { type: Number, min: 0 },
    seasonalRate: { type: Number, min: 0 },
    surgeMultiplier: { type: Number, min: 1, default: 1 }
  },
  discount: {
    percent: { type: Number, min: 0, max: 100, default: 0 },
    validUntil: { type: Date }
  },
  availability: availabilitySchema,
  cities: [citySchema],
  
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  blackoutPeriods: [{
    from: { type: Date, required: false },
    to: { type: Date, required: false },
    reason: {
      type: String,
      enum: ['buffer', 'maintenance', 'other'],
      default: 'buffer'
    },
    relatedBooking: { type: Schema.Types.ObjectId, ref: 'Booking' }
  }],
  
  
  bookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    set: function(val) {
      return Math.round(val * 10) / 10; // Round to 1 decimal place
    }
  },
  minimumRentalHours: {
    type: Number,
    default: 4,
    min: 1,
    max: 24
  },
  maximumRentalDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if insurance is valid
vehicleSchema.virtual('isInsuranceValid').get(function() {
  return this.insurance.expiry > new Date();
});

// Indexes
vehicleSchema.index({ currentLocation: '2dsphere' });
vehicleSchema.index({ manufacturer: 1, model: 1 });
vehicleSchema.index({ year: -1 });
vehicleSchema.index({ rent: 1 });

vehicleSchema.plugin(mongooseAggregatePaginate);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;