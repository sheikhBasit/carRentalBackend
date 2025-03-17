const mongoose = require('mongoose');

const rentalCompanySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phNum: { type: String, required: true },
  bankName: { type: String, required: true },
  bankTitle: { type: String, required: true },
  accountNo: { type: String, required: true },
  cnic: { type: String, required: true, unique: true },
  cnicFrontUrl: { type: String, required: true, unique: true },
  cnicBackUrl: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, required: true },
  fcmtoken: { type: String, required: false }, // Optional field for Firebase Cloud Messaging token
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const RentalCompany = mongoose.model('RentalCompany', rentalCompanySchema);

module.exports = RentalCompany;
