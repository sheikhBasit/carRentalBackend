// controllers/likeController.js
const Like = require("../models/like");

// Like a Vehicle
exports.likeVehicle = async (vehicleId, userId) => {
  try {
    const like = new Like({ vehicleId, userId });
    await like.save();
    return like;
  } catch (error) {
    console.error("Error liking vehicle:", error);
    throw error;
  }
};
// Get vehicles liked by a user
exports.getLikedVehiclesByUser = async (userId) => {
  try {
    const likedVehicles = await Like.find({ userId }).populate("vehicleId");
    return likedVehicles.map(like => like.vehicleId);
  } catch (error) {
    console.error("Error fetching liked vehicles by user:", error);
    throw error;
  }
};


// Unlike a vehicle
exports.unlikeVehicle = async (vehicleId, userId) => {
  try {
    const result = await Like.deleteOne({ vehicleId, userId });
    return result;
  } catch (error) {
    console.error("Error unliking vehicle:", error);
    throw error;
  }
};

// Get likes for a vehicle
exports.getLikes = async (vehicleId) => {
  try {
    const likes = await Like.find({ vehicleId }).populate("userId", "username");
    return likes;
  } catch (error) {
    console.error("Error fetching likes:", error);
    throw error;
  }
};