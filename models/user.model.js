const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  cardNumber: { type: String, required: true },
  cardHolderName: { type: String, required: false },
  expiryDate: { type: String, required: true }, // Format: MM/YY
  cvv: { type: String, required: false },
  isDefault: { type: Boolean, default: false },
  cardType: { type: String, enum: ['visa', 'mastercard', 'amex', 'discover', 'other'], required: true },
  lastFourDigits: { type: String, required: false } // For display purposes
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  phoneNo: { type: String, required: false },
  address: { type: String, required: false },
  profilePic: { type: String, required: false },
  accountNo: { type: String, required: false, unique: false },
  city: { type: String, required: false },
  fcmToken: { type: String, required: false },
  province: { type: String, required: false },
  license: { type: String, required: false },
  licenseFrontUrl: { type: String, required: false },
  licenseBackUrl: { type: String, required: false },
  cnic: { type: String, required: false, unique: true },
  cnicFrontUrl: { type: String, required: false },
  cnicBackUrl: { type: String, required: false },
  age: { type: Number, required: false, min: 18 }, // Age requirement for Pakistani drivers
  otp: { type: String, required: false }, // For phone verification
  otpVerified: { type: Boolean, default: false },
  licenseVerified: { type: Boolean, default: false },
  cnicVerified: { type: Boolean, default: false },
  paymentMethods: [paymentMethodSchema], // Added payment methods array
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  verificationToken: String,
  verificationPasswordToken: Date,
  verificationTokenExpiresAt: Date,
  // --- RBAC and Compliance Fields ---
  role: { type: String, enum: ['customer', 'host', 'admin'], default: 'customer', required: false },
  isBlocked: { type: Boolean, default: false },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  twoFactorEnabled: { type: Boolean, default: false },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;