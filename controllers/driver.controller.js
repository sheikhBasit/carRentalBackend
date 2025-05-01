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
      pricingTiers = [],
      currentPromotion = null,
      availability,
      blackoutDates = []
    } = req.body;

    // ========== VALIDATION SECTION ========== //

    // 1. Required Fields Validation
    const requiredFields = {
      name: 'Full Name',
      company: 'Company',
      license: 'License Number',
      cnic: 'CNIC',
      phNo: 'Phone Number',
      age: 'Age',
      experience: 'Experience',
      baseHourlyRate: 'Base Hourly Rate',
      baseDailyRate: 'Base Daily Rate',
      availability: 'Availability'
    };

    const missingFields = [];
    for (const [field, fieldName] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        missingFields.push(fieldName);
      }
    }

    // 2. Availability Sub-Fields Validation
    if (availability) {
      const requiredAvailabilityFields = {
        days: 'Availability Days',
        startTime: 'Availability Start Time',
        endTime: 'Availability End Time'
      };

      for (const [field, fieldName] of Object.entries(requiredAvailabilityFields)) {
        if (!availability[field]) {
          missingFields.push(fieldName);
        }
      }

      if (availability.days && !Array.isArray(availability.days)) {
        missingFields.push('Availability Days must be an array');
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields',
        details: {
          missingFields,
          message: `The following fields are required: ${missingFields.join(', ')}`
        }
      });
    }

    // 3. Phone Number Validation
    const formattedPhNo = phNo.replace(/\s/g, '');
    const cleanNumber = formattedPhNo.replace(/[^\d+]/g, '');
    
    if (!cleanNumber.match(/^((\+92|0)3[0-9]{9})$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
        details: "Please use format: +923XX-XXXXXXX or 03XX-XXXXXXX"
      });
    }

    // 4. Profile Image Validation
    if (!req.files?.profileimg || req.files.profileimg.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Profile image is required",
        details: "Please upload a profile image"
      });
    }

    // 5. Duplicate Check Validation
    const existingDriver = await Driver.findOne({
      $or: [
        { license: license.toUpperCase() },
        { cnic: cnic }
      ]
    });

    if (existingDriver) {
      const conflictFields = [];
      if (existingDriver.license === license.toUpperCase()) conflictFields.push('License Number');
      if (existingDriver.cnic === cnic) conflictFields.push('CNIC');

      return res.status(409).json({
        success: false,
        error: "Driver already exists",
        details: {
          conflictFields,
          message: `Driver with this ${conflictFields.join(' and ')} already exists`
        }
      });
    }

    // ========== PROCESSING SECTION ========== //

    // 1. Upload Profile Image
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
        error: "Profile image upload failed",
        details: "Please try again or contact support"
      });
    }

    // 2. Create Driver Document
    const driver = new Driver({
      name,
      company,
      license: license.toUpperCase(),
      cnic,
      phNo: formattedPhNo,
      age: Number(age),
      experience: Number(experience),
      profileimg: profileImageUrl,
      baseHourlyRate: Number(baseHourlyRate),
      baseDailyRate: Number(baseDailyRate),
      pricingTiers,
      currentPromotion,
      availability,
      blackoutDates,
    });

    // 3. Save to Database
    await driver.save();

    // ========== RESPONSE SECTION ========== //
    return res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: {
        ...driver.toObject({ virtuals: true }),
        __v: undefined
      }
    });

  } catch (error) {
    console.error("Error creating driver:", error);
    
    // Handle different error types appropriately
    let statusCode = 500;
    let errorMessage = 'An error occurred while creating the driver';
    let errorDetails = null;

    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Validation failed';
      errorDetails = Object.values(error.errors).map(err => err.message);
    } else if (error.name === 'MongoError' && error.code === 11000) {
      statusCode = 409;
      errorMessage = 'Duplicate key error';
      errorDetails = 'A driver with these details already exists';
    }

    return res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : errorDetails
    });
  }
};
exports.getAllDrivers = async (req, res) => {
  try {
    const {
      company,
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

    // Format phone number before validation
    const formattedPhNo = phNo ? phNo.replace(/\s/g, '') : existingDriver.phNo;
    const cleanNumber = formattedPhNo.replace(/[^\d+]/g, '');
    
    // Check if it's a valid Pakistani mobile number
    if (!cleanNumber.match(/^((\+92|0)3[0-9]{9})$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Please use format: +923XX-XXXXXXX or 03XX-XXXXXXX"
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
      ...(phNo && { phNo: formattedPhNo }),
      ...(age && { age }),
      ...(experience && { experience }),
      ...(baseHourlyRate && { baseHourlyRate }),
      ...(baseDailyRate && { baseDailyRate }),
      ...(pricingTiers && { pricingTiers }),
      ...(currentPromotion && { currentPromotion }),
      ...(availability && { availability }),
      ...(blackoutDates && { blackoutDates }),
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

// Get available drivers for a given date (and optionally time)
exports.getAvailableDriversByDate = async (req, res) => {
  try {
    const { date, time, needDriver } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    if (needDriver !== 'true') {
      return res.status(200).json({ success: true, message: 'Driver not needed', data: [] });
    }
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[inputDate.getDay()];

    // Build query
    const matchStage = {
      'availability.days': dayName,
      $or: [
        { blackoutDates: { $exists: false } },
        { blackoutDates: { $size: 0 } },
        { blackoutDates: { $not: { $elemMatch: { $eq: inputDate.toISOString().split('T')[0] } } } }
      ],
    };

    // If time is provided, filter by time window
    let drivers = await Driver.find(matchStage);
    if (time) {
      drivers = drivers.filter(driver => {
        if (!driver.availability?.startTime || !driver.availability?.endTime) return true;
        return time >= driver.availability.startTime && time <= driver.availability.endTime;
      });
    }
    return res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error('Error fetching available drivers by date:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
