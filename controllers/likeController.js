const Like = require('../models/like');
const Vehicle = require('../models/vehicle.model');

// Like a vehicle
exports.likeVehicle = async (vehicleId, userId) => {
    // Check if vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    // Check if already liked
    const existingLike = await Like.findOne({ vehicleId, userId });
    if (existingLike) {
        throw new Error('Vehicle already liked by user');
    }

    const like = new Like({ vehicleId, userId });
    return await like.save();
};

// Unlike a vehicle
exports.unlikeVehicle = async (req, res) => {
    try {
        const { vehicleId, userId } = req.params;
        const result = await Like.findOneAndDelete({ vehicleId, userId });
        
        if (!result) {
            return res.status(404).json({ message: 'Like not found' });
        }
        
        res.status(200).json({ message: 'Successfully unliked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get likes for a specific vehicle
exports.getLikes = async (vehicleId) => {
    return await Like.find({ vehicleId }).populate('userId', 'name email');
};

// Get liked vehicles by a user
exports.getLikedVehiclesByUser = async (userId) => {
    const likes = await Like.find({ userId })
        .populate('vehicleId')
        .sort({ timestamp: -1 });
    
    return likes.map(like => like.vehicleId);
};

// Check if a vehicle is liked by a user
exports.isLikedByUser = async (vehicleId, userId) => {
    const like = await Like.findOne({ vehicleId, userId });
    return !!like;
};