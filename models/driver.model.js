const mongoose = require('mongoose');
const{Schema} = mongoose;
const driverSchema = new Schema({
  name: { type: String, required: true },
  profileimg:{type:String , required:true},
  company:{type: Schema.Types.ObjectId, ref: "RentalCompany",required: true},
  license: { type: String, required: true, unique: true }, // Corrected spelling from "liscence" to "license"
  phNo: { type: String, required: true },
  age: { type: Number, required: true },
  experience: { type: Number, required: true }, // Assuming experience is in years
  // rating
  cnic: { type: String, required: true, unique: true }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
