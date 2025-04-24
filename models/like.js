const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
}, {
  // Add compound index to ensure unique like per user per vehicle
  timestamps: true
});

// Add compound index to prevent duplicate likes
likeSchema.index({ vehicleId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);