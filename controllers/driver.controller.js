const Driver = require('../models/driver.model.js');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');

exports.createDriver = async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.files); // Debugging - See what file is received

    let profileImageLocalPath;
    if (req.files && req.files.profileimg && req.files.profileimg.length > 0) {
      profileImageLocalPath = req.files.profileimg[0].path;
    }

    if (!profileImageLocalPath) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    // Upload to Cloudinary
    const profileImageUrl = await uploadOnCloudinary(profileImageLocalPath);
    if (!profileImageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }

    // Save to DB
    const driver = new Driver({
      ...req.body,
      profileimg: profileImageUrl.url, // Store Cloudinary URL in DB
    });

    await driver.save();

    return res.status(201).json({
      message: "Driver created successfully",
      driver,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find()
    if(!drivers || drivers.length === 0){
      res.status(404).json({message:"No Driver is found"})
    }
    return res.status(200).json(drivers);
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};

// Get a single driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.status(200).json(driver);
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};

exports.getCompanyDrivers = async (req, res) => {
  try {
      const { company } = req.query;

      if (!company) {
          return res.status(400).json({ error: "Company name is required" });
      }

      const drivers = await Driver.find({ company });

    if (!drivers) return res.status(404).json({ message: 'Driver not found' });

    return res.status(200).json({ success: true, drivers });
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};
// Update a driver
exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.status(200).json({ message: 'Driver updated successfully', driver });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Delete a driver
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    return res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
