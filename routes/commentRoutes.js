// routes/commentRoutes.js
const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");

// Add a comment to a vehicle
router.post("/", async (req, res) => {
  try {
    const { vehicleId, userId, message } = req.body;
    const comment = await commentController.addComment(vehicleId, userId, message);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error adding comment" });
  }
});

router.get("/average/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const comments = await commentController.getAverageRating(vehicleId);
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments" });
  }
});


// Get comments for a vehicle
router.get("/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const comments = await commentController.getComments(vehicleId);
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments" });
  }
});



module.exports = router;