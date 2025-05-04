const mongoose = require('mongoose');
const { Schema } = mongoose;

const damageReportSchema = new Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  images: [{ type: String }], // URLs to uploaded images
  description: { type: String, required: true },
  reportedAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false }
});

module.exports = mongoose.model('DamageReport', damageReportSchema);
