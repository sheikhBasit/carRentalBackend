const Driver = require('../models/driver.model.js');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const mongoose = require('mongoose');
const Booking = require('../models/booking.model.js');

// exports.createDriver = async (req, res) => {
//   try {
//     console.log(req.body);
//     console.log(req.files); // Debugging - See what file is received

//     let profileImageLocalPath;
//     if (req.files && req.files.profileimg && req.files.profileimg.length > 0) {
//       profileImageLocalPath = req.files.profileimg[0].path;
//     }

//     if (!profileImageLocalPath) {
//       return res.status(400).json({ message: "Profile image is required" });
//     }

//     // Upload to Cloudinary
//     const profileImageUrl = await uploadOnCloudinary(profileImageLocalPath);
//     if (!profileImageUrl) {
//       return res.status(500).json({ message: "Image upload failed" });
//     }

//     // Save to DB
//     const driver = new Driver({
//       ...req.body,
//       profileimg: profileImageUrl.url, // Store Cloudinary URL in DB
//     });

//     await driver.save();

//     return res.status(201).json({
//       message: "Driver created successfully",
//       driver,
//     });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// Get all drivers
exports.createDriver = async (req, res) => {
  try {
    const {
      name,
      company,
      license,
      cnic,
      phNo,
      age,
      experience,
      baseHourlyRate,
      baseDailyRate,
      pricingTiers,
      currentPromotion,
      availability,
      blackoutDates
    } = req.body;

    // Validate required fields
    if (!name || !company || !license || !cnic || !phNo || !age || 
        !experience || !baseHourlyRate || !baseDailyRate || !availability) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      });
    }

    // Validate profile image
    if (!req.files?.profileimg || req.files.profileimg.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Profile image is required" 
      });
    }

    // Check for existing driver with same license or CNIC
    const existingDriver = await Driver.findOne({
      $or: [
        { license: license.toUpperCase() },
        { cnic: cnic }
      ]
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: "Driver with this license or CNIC already exists"
      });
    }

    // Upload profile image
    const profileImage = req.files.profileimg[0];
    let profileImageUrl;
    
    try {
      const result = await uploadOnCloudinary(profileImage.buffer);
      if (!result?.url) {
        throw new Error('Failed to upload profile image');
      }
      profileImageUrl = result.url;
    } catch (uploadError) {
      console.error("Error uploading driver image:", uploadError);
      return res.status(500).json({ 
        success: false,
        message: "Profile image upload failed" 
      });
    }

    // Create new driver
    const driver = new Driver({
      name,
      company,
      license: license.toUpperCase(),
      cnic,
      phNo,
      age,
      experience,
      profileimg: profileImageUrl,
      baseHourlyRate,
      baseDailyRate,
      pricingTiers: pricingTiers || [],
      currentPromotion: currentPromotion || null,
      availability,
      blackoutDates: blackoutDates || [],
      isAvailable: true
    });

    await driver.save();

    return res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: {
        ...driver.toObject(),
        __v: undefined
      }
    });
  } catch (error) {
    console.error("Error creating driver:", error);
    
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({ 
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while creating the driver'
        : error.message 
    });
  }
};

exports.getAllDrivers = async (req, res) => {
  try {
    const {
      company,
      isAvailable,
      minRating,
      maxRating,
      minExperience,
      maxExperience,
      minAge,
      maxAge,
      minHourlyRate,
      maxHourlyRate,
      vehicleType
    } = req.query;

    const matchStage = {};

    // Add filters based on query parameters
    if (company) {
      matchStage.company = new mongoose.Types.ObjectId(company);
    }
    if (isAvailable !== undefined) {
      matchStage.isAvailable = isAvailable === 'true';
    }
    if (minRating || maxRating) {
      matchStage.rating = {};
      if (minRating) matchStage.rating.$gte = Number(minRating);
      if (maxRating) matchStage.rating.$lte = Number(maxRating);
    }
    if (minExperience || maxExperience) {
      matchStage.experience = {};
      if (minExperience) matchStage.experience.$gte = Number(minExperience);
      if (maxExperience) matchStage.experience.$lte = Number(maxExperience);
    }
    if (minAge || maxAge) {
      matchStage.age = {};
      if (minAge) matchStage.age.$gte = Number(minAge);
      if (maxAge) matchStage.age.$lte = Number(maxAge);
    }
    if (minHourlyRate || maxHourlyRate) {
      matchStage.baseHourlyRate = {};
      if (minHourlyRate) matchStage.baseHourlyRate.$gte = Number(minHourlyRate);
      if (maxHourlyRate) matchStage.baseHourlyRate.$lte = Number(maxHourlyRate);
    }
    if (vehicleType) {
      matchStage['pricingTiers.vehicleType'] = vehicleType;
    }

    const aggregationPipeline = [
      {
        $lookup: {
          from: "rentalcompanies",
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [
            {
              $project: {
                companyName: 1,
                email: 1,
                address: 1,
                phNum: 1,
                city: 1
              }
            }
          ]
        }
      },
      { $unwind: "$company" },
      { $match: matchStage },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "driver",
          as: "bookings",
          pipeline: [
            { $match: { status: "completed" } }
          ]
        }
      },
      {
        $addFields: {
          completedTrips: { $size: "$bookings" },
          isCurrentlyAssigned: {
            $and: [
              { $gt: ["$currentAssignment.endTime", new Date()] },
              { $ne: ["$currentAssignment.booking", null] }
            ]
          },
          isOnPromotion: {
            $and: [
              { $gt: ["$currentPromotion.validUntil", new Date()] },
              { $gt: ["$currentPromotion.discountPercentage", 0] }
            ]
          }
        }
      },
      {
        $project: {
          __v: 0,
          "bookings": 0
        }
      }
    ];

    const drivers = await Driver.aggregate(aggregationPipeline);

    if (!drivers || drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No drivers found"
      });
    }

    return res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching drivers'
        : error.message
    });
  }
};

// Get a single driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const aggregationPipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: "rentalcompanies",
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [
            {
              $project: {
                companyName: 1,
                email: 1,
                address: 1,
                phNum: 1,
                city: 1
              }
            }
          ]
        }
      },
      { $unwind: "$company" },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "driver",
          as: "bookings",
          pipeline: [
            { $match: { status: { $in: ['confirmed', 'pending'] } } }
          ]
        }
      },
      {
        $addFields: {
          completedTrips: { $size: "$bookings" },
          isCurrentlyAssigned: {
            $and: [
              { $gt: ["$currentAssignment.endTime", new Date()] },
              { $ne: ["$currentAssignment.booking", null] }
            ]
          },
          isOnPromotion: {
            $and: [
              { $gt: ["$currentPromotion.validUntil", new Date()] },
              { $gt: ["$currentPromotion.discountPercentage", 0] }
            ]
          }
        }
      },
      {
        $project: {
          __v: 0,
          "bookings": 0
        }
      }
    ];

    const result = await Driver.aggregate(aggregationPipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const driver = result[0];
    return res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error("Error fetching driver:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching the driver'
        : error.message
    });
  }
};

exports.getCompanyDrivers = async (req, res) => {
  try {
    const { company } = req.query;

    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID"
      });
    }

    const aggregationPipeline = [
      {
        $match: { company: new mongoose.Types.ObjectId(company) }
      },
      {
        $lookup: {
          from: "rentalcompanies",
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [
            {
              $project: {
                companyName: 1,
                email: 1,
                address: 1,
                phNum: 1,
                city: 1
              }
            }
          ]
        }
      },
      { $unwind: "$company" },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "driver",
          as: "bookings",
          pipeline: [
            { $match: { status: "completed" } }
          ]
        }
      },
      {
        $addFields: {
          completedTrips: { $size: "$bookings" },
          isCurrentlyAssigned: {
            $and: [
              { $gt: ["$currentAssignment.endTime", new Date()] },
              { $ne: ["$currentAssignment.booking", null] }
            ]
          },
          isOnPromotion: {
            $and: [
              { $gt: ["$currentPromotion.validUntil", new Date()] },
              { $gt: ["$currentPromotion.discountPercentage", 0] }
            ]
          }
        }
      },
      {
        $project: {
          __v: 0,
          "bookings": 0
        }
      }
    ];

    const drivers = await Driver.aggregate(aggregationPipeline);

    if (!drivers || drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No drivers found for this company"
      });
    }

    return res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error("Error fetching company drivers:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching company drivers'
        : error.message
    });
  }
};

// Update a driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      license,
      cnic,
      phNo,
      age,
      experience,
      baseHourlyRate,
      baseDailyRate,
      pricingTiers,
      currentPromotion,
      availability,
      blackoutDates,
      isAvailable
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    // Check if driver exists
    const existingDriver = await Driver.findById(id);
    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Check for duplicate license or CNIC if being updated
    if (license || cnic) {
      const duplicateDriver = await Driver.findOne({
        $and: [
          { _id: { $ne: id } },
          {
            $or: [
              ...(license ? [{ license: license.toUpperCase() }] : []),
              ...(cnic ? [{ cnic }] : [])
            ]
          }
        ]
      });

      if (duplicateDriver) {
        return res.status(400).json({
          success: false,
          message: "Driver with this license or CNIC already exists"
        });
      }
    }

    // Handle profile image update if provided
    let profileImageUrl = existingDriver.profileimg;
    if (req.files?.profileimg && req.files.profileimg.length > 0) {
      const profileImage = req.files.profileimg[0];
      try {
        const result = await uploadOnCloudinary(profileImage.buffer);
        if (!result?.url) {
          throw new Error('Failed to upload profile image');
        }
        profileImageUrl = result.url;
      } catch (uploadError) {
        console.error("Error uploading driver image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Profile image upload failed"
        });
      }
    }

    // Prepare update object
    const updateData = {
      ...(name && { name }),
      ...(license && { license: license.toUpperCase() }),
      ...(cnic && { cnic }),
      ...(phNo && { phNo }),
      ...(age && { age }),
      ...(experience && { experience }),
      ...(baseHourlyRate && { baseHourlyRate }),
      ...(baseDailyRate && { baseDailyRate }),
      ...(pricingTiers && { pricingTiers }),
      ...(currentPromotion && { currentPromotion }),
      ...(availability && { availability }),
      ...(blackoutDates && { blackoutDates }),
      ...(typeof isAvailable === 'boolean' && { isAvailable }),
      profileimg: profileImageUrl
    };

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: updatedDriver
    });
  } catch (error) {
    console.error("Error updating driver:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while updating the driver'
        : error.message
    });
  }
};

// Delete a driver
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    // Check if driver exists
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Check if driver has any active assignments
    if (driver.currentAssignment && driver.currentAssignment.endTime > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete driver with active assignment"
      });
    }

    // Check if driver has any active bookings
    const activeBookings = await Booking.find({
      driver: id,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete driver with active bookings"
      });
    }

    // Delete the driver
    await Driver.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Driver deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while deleting the driver'
        : error.message
    });
  }
};
