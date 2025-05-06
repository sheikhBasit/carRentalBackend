const mongoose = require('mongoose');
const { Schema } = mongoose;

const availabilitySchema = new Schema({
  days: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  }
});

const pricingTierSchema = new Schema({
  vehicleType: {
    type: String,
    enum: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Van', 'Truck'],
    required: true
  },
  hourlyRate: {
    type: Number,
    min: 0,
    required: true
  },
  dailyRate: {
    type: Number,
    min: 0,
    required: true
  }
});

const driverSchema = new Schema({
  // Basic Information
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  profileimg: {
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
  },
  
  // host Reference
  host: {
    type: Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  
  // Identification
  license: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  cnic: { 
    type: String, 
    required: true, 
    unique: true,
    
  },
  
  // Contact Information
  phNo: { 
    type: String, 
    required: true,
    
  },
  
  // Professional Details
  age: { 
    type: Number, 
    required: true,
    min: 18,
    max: 70 
  },
  experience: { 
    type: Number, 
    required: true,
    min: 0,
    max: 50 
  },
  
  // Pricing Information
  baseHourlyRate: {
    type: Number,
    min: 0,
    required: true
  },
  baseDailyRate: {
    type: Number,
    min: 0,
    required: true
  },
  pricingTiers: [pricingTierSchema], // Special rates for different vehicle types
  currentPromotion: {
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    validUntil: Date
  },
  
  // Availability System
  availability: availabilitySchema,
  
  blackoutDates: [{ 
    type: Date,
    validate: {
      validator: function(date) {
        return date >= new Date();
      },
      message: 'Blackout dates must be in the future'
    }
  }],
  
  
  // Booking Management
  bookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  
  // Performance Metrics
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    set: function(val) {
      return Math.round(val * 10) / 10;
    }
  },
  completedTrips: {
    type: Number,
    default: 0,
    min: 0
  },
  
  
  
  // Current Assignment
  currentAssignment: {
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle'
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking'
    },
    endTime: Date,
    currentRate: Number // Current active rate for this assignment
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Properties
driverSchema.virtual('isCurrentlyAssigned').get(function() {
  return this.currentAssignment && this.currentAssignment.endTime > new Date();
});

driverSchema.virtual('isOnPromotion').get(function() {
  return this.currentPromotion && 
         this.currentPromotion.validUntil > new Date() &&
         this.currentPromotion.discountPercentage > 0;
});

// Calculate effective hourly rate considering promotions
driverSchema.methods.getEffectiveHourlyRate = function(vehicleType) {
  let rate = this.baseHourlyRate;
  
  // Check for vehicle-specific pricing tier
  const tier = this.pricingTiers.find(t => t.vehicleType === vehicleType);
  if (tier) {
    rate = tier.hourlyRate;
  }
  
  // Apply promotion if available
  if (this.isOnPromotion) {
    rate = rate * (1 - (this.currentPromotion.discountPercentage / 100));
  }
  
  return Math.round(rate * 100) / 100; // Round to 2 decimal places
};

// Indexes
driverSchema.index({ host: 1 });
driverSchema.index({ rating: -1 });
driverSchema.index({ 'currentAssignment.booking': 1 });
driverSchema.index({ baseHourlyRate: 1 });
driverSchema.index({ certifications: 1 });

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;