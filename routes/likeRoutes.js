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
    res.status(400).json({ message: error.message });
  }
});

// Get liked vehicles by user
router.get("/liked-vehicles/:userId", async (req, res) => {
  try {
    const vehicles = await likeController.getLikedVehiclesByUser(req.params.userId);
    res.status(200).json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unlike a vehicle
router.delete('/unlike/:vehicleId/:userId', likeController.unlikeVehicle);

// Get likes for a vehicle
router.get("/:vehicleId", async (req, res) => {
  try {
    const likes = await likeController.getLikes(req.params.vehicleId);
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if vehicle is liked by user
router.get("/is-liked/:vehicleId/:userId", async (req, res) => {
  try {
    const isLiked = await likeController.isLikedByUser(
      req.params.vehicleId, 
      req.params.userId
    );
    res.status(200).json({ isLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;