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
  company: {
    type: Schema.Types.ObjectId, 
    ref: "RentalCompany",
    required: true 
  },
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
  phNo: { 
    type: String, 
    required: true,
    unique: true,
  },
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
  baseHourlyRate: {
    type: Number,
    min: 0,
    required: false
  },
  baseDailyRate: {
    type: Number,
    min: 0,
    required: true
  },
  pricingTiers: [pricingTierSchema],
  currentPromotion: {
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    validUntil: Date
  },
  availability: availabilitySchema,
  blackoutPeriods: [{
    from: { type: Date, required: true },
    to: { type: Date, required: true },
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
    set: val => Math.round(val * 10) / 10
  },
  completedTrips: {
    type: Number,
    default: 0,
    min: 0
  },
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
    currentRate: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
driverSchema.virtual('isCurrentlyAssigned').get(function() {
  return this.currentAssignment && this.currentAssignment.endTime && this.currentAssignment.endTime.getTime() > Date.now();
});

driverSchema.virtual('isOnPromotion').get(function() {
  return this.currentPromotion && 
         this.currentPromotion.validUntil &&
         this.currentPromotion.validUntil.getTime() > Date.now() &&
         this.currentPromotion.discountPercentage > 0;
});

// Methods
driverSchema.methods.getEffectiveHourlyRate = function(vehicleType) {
  let rate = this.baseHourlyRate;
  const tier = this.pricingTiers.find(t => t.vehicleType === vehicleType);
  if (tier) {
    rate = tier.hourlyRate;
  }
  if (this.isOnPromotion) {
    rate = rate * (1 - (this.currentPromotion.discountPercentage / 100));
  }
  return Math.round(rate * 100) / 100;
};

driverSchema.methods.isAvailableForDateTimeRange = function(startDateTime, endDateTime) {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (this.blackoutDates?.some(date => new Date(date).toDateString() === start.toDateString())) {
    return false;
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[start.getDay()];
  if (!this.availability.days.includes(dayName)) {
    return false;
  }

  const [startHour, startMinute] = this.availability.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.availability.endTime.split(':').map(Number);

  const availabilityStart = new Date(start);
  availabilityStart.setHours(startHour, startMinute, 0, 0);

  const availabilityEnd = new Date(start);
  availabilityEnd.setHours(endHour, endMinute, 0, 0);

  return start >= availabilityStart && end <= availabilityEnd;
};

driverSchema.methods.hasBookingConflict = async function(startDateTime, endDateTime) {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (this.currentAssignment?.endTime && this.currentAssignment.endTime.getTime() > start.getTime()) {
    return true;
  }

  const conflictingBookings = await mongoose.model('Booking').find({
    driver: this._id,
    $or: [
      { startTime: { $lt: end }, endTime: { $gt: start } },
      { startTime: { $gte: start, $lte: end } },
      { endTime: { $gte: start, $lte: end } }
    ]
  }); // .lean() can be added here if desired

  return conflictingBookings.length > 0;
};

// Indexes
driverSchema.index({ company: 1 });
driverSchema.index({ rating: -1 });
driverSchema.index({ 'currentAssignment.booking': 1 });
driverSchema.index({ baseHourlyRate: 1 });
// Removed nonexistent index on 'certifications'

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
