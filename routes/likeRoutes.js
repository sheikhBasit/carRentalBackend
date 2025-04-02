// routes/likeRoutes.js
const express = require("express");
const router = express.Router();
const likeController = require("../controllers/likeController");

// Like a vehicle
router.post("/", async (req, res) => {
  try {
    const { vehicleId, userId } = req.body;
    const like = await likeController.likeVehicle(vehicleId, userId);
    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ message: "Error liking vehicle" });
  }
});

// Unlike a vehicle
router.post("/unlike", async (req, res) => {
  try {
    const { vehicleId, userId } = req.body;
    const result = await likeController.unlikeVehicle(vehicleId, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error unliking vehicle" });
  }
});

// Get likes for a vehicle
router.get("/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const likes = await likeController.getLikes(vehicleId);
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching likes" });
  }
});

module.exports = router;