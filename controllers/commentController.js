// controllers/commentController.js
const Comment = require("../models/comment");

// Add a comment to a vehicle
exports.addComment = async (vehicleId, userId, message, rating) => {
  console.log("Adding comment:", { vehicleId, userId, message, rating });

  try {
    const comment = new Comment({ vehicleId, userId, message, rating });
    await comment.save();
    return comment;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};
// Get comments for a vehicle
exports.getComments = async (vehicleId) => {
  try {
    const comments = await Comment.find({ vehicleId })
      .populate("userId", "username profilePic") // Populate username and profilePhoto
      .sort({ timestamp: 1 });
    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

// Calculate average rating for a vehicle
exports.getAverageRating = async (vehicleId) => {
  try {
    const result = await Comment.aggregate([
      { $match: { vehicleId: mongoose.Types.ObjectId(vehicleId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" }
        }
      }
    ]);

    if (result.length > 0) {
      return result[0].averageRating;
    } else {
      return 0; // No ratings found
    }
  } catch (error) {
    console.error("Error calculating average rating:", error);
    throw error;
  }
};