const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true }, // Rating field (1 to 5 stars)
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Comment", commentSchema);