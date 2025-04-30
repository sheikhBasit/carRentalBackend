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
  carImageUrls: [{ 
    type: String, 
    trim: true 
  }],
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
    required: true,
    min: 1,
    max: 20 
  },
  transmission: { 
    type: String, 
    enum: ['Auto', 'Manual'], 
    required: true 
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'],
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Van', 'Truck', 'Minivan', 'Pickup'],
    required: true
  },
  features: [{
    type: String,
    enum: [
      'AC', 'Heating', 'Bluetooth', 'Navigation', 'Sunroof', 
      'Backup Camera', 'Keyless Entry', 'Leather Seats', 'Child Seat',
      'Android Auto', 'Apple CarPlay', 'USB Ports', 'WiFi', 'Premium Sound'
    ]
  }],
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
  insuranceExpiry: { 
    type: Date,
    required: true 
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
  blackoutDates: [{ 
    type: Date,
    validate: {
      validator: function(date) {
        return date >= new Date();
      },
      message: 'Blackout dates must be in the future'
    }
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if insurance is valid
vehicleSchema.virtual('isInsuranceValid').get(function() {
  return this.insuranceExpiry > new Date();
});

// Indexes
vehicleSchema.index({ currentLocation: '2dsphere' });
vehicleSchema.index({ manufacturer: 1, model: 1 });
vehicleSchema.index({ year: -1 });
vehicleSchema.index({ rent: 1 });

vehicleSchema.plugin(mongooseAggregatePaginate);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;