const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNo: { type: String, required: true },
  address: { type: String, required: true },
  profilePic: { type: String, required: false },
  accountNo: { type: String, required: false, unique: true },
  city: { type: String, required: true },
  fcmToken: { type: String, required: false }, // For Firebase Cloud Messaging, optional
  province: { type: String, required: true },
  license: { type: String, required: false },
  licenseFrontUrl: { type: String, required: false },
  licenseBackUrl: { type: String, required: false },
  cnic: { type: String, required: true, unique: true },
  cnicFrontUrl: { type: String, required: false },
  cnicBackUrl: { type: String, required: false },
  lastLogin:{
    type: Date,
    default: Date.now
},
isVerified:{
    type: Boolean,
    default: false
},
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  verificationToken: String,
  verificationPasswordToken: Date,
  verificationTokenExpiresAt: Date,
}, {
  timestamps: true  // Adds createdAt and updatedAt fields automatically
});

const User = mongoose.model('User', userSchema);

module.exports = User;
