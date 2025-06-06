const Driver = require('../models/driver.model.js');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const mongoose = require('mongoose');
const Booking = require('../models/booking.model.js');

// Parse availability data - helper function
const parseAvailability = (reqBody) => {
  let availability = {};
  
  // Case 1: Availability comes as a JSON string or object
  if (reqBody.availability) {
    try {
      availability = typeof reqBody.availability === 'string' 
        ? JSON.parse(reqBody.availability)
        : reqBody.availability;
      
      // Validate required fields
      if (!availability.days || !availability.startTime || !availability.endTime) {
        throw new Error('Incomplete availability data');
      }
      
      return availability;
    } catch (e) {
      console.error("Error parsing availability", e);
    }
  }
  
  // Case 2: Old format with bracket notation
  if (reqBody['availability[days]']) {
    try {
      let days = reqBody['availability[days]'];
      if (typeof days === 'string') {
        days = JSON.parse(days);
      }
      
      availability = {
        days: days,
        startTime: reqBody['availability[startTime]'] || '08:00',
        endTime: reqBody['availability[endTime]'] || '20:00'
      };
      
      return availability;
    } catch (e) {
      console.error("Error parsing old format availability", e);
    }
  }
  
  // Default availability if parsing fails
  return {
    days: [],
    startTime: '08:00',
    endTime: '20:00'
  };
};

exports.createDriver = async (req, res) => {
  try {
    // Enhanced logging
    console.log("Received form data:", JSON.stringify(req.body, null, 2));
    
    // Destructure required fields
    const {
      name,
      company,
      license,
      cnic,
      phNo,
      age,
      experience,
      baseHourlyRate,
      baseDailyRate
    } = req.body;

    // Validate required fields
    if (!name || !company || !license || !cnic || !phNo || !age || 
        !experience || !baseDailyRate) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      });
    }

    // Phone number validation
    const formattedPhNo = phNo.replace(/\s/g, '');
    const cleanNumber = formattedPhNo.replace(/[^\d+]/g, '');
    
    if (!cleanNumber.match(/^((\+92|0)3[0-9]{9})$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Please use format: +923XX-XXXXXXX or 03XX-XXXXXXX"
      });
    }
    // Profile image validation
    if (!req.files?.profileimg || req.files.profileimg.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Profile image is required" 
      });
    }

    // Check for existing driver
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

    // Parse all data fields
    const availability = parseAvailability(req.body);
    
    

    // Parse blackout dates
    const blackoutDates = Object.keys(req.body)
      .filter(key => key.startsWith('blackoutDates['))
      .map(key => new Date(req.body[key]));

    // Create driver object
    const driver = new Driver({
      name,
      company,
      license: license.toUpperCase(),
      cnic,
      phNo: formattedPhNo,
      age: parseInt(age),
      experience: parseInt(experience),
      profileimg: profileImageUrl,
      baseDailyRate: parseFloat(baseDailyRate),
      availability,
      blackoutDates,
      currentPromotion: req.body['currentPromotion[discountPercentage]'] ? {
        discountPercentage: parseFloat(req.body['currentPromotion[discountPercentage]']),
        validUntil: req.body['currentPromotion[validUntil]'] 
          ? new Date(req.body['currentPromotion[validUntil]']) 
          : null
      } : null
    });

    // Save driver
    await driver.save();

    // Return success response
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
    let {
      name,
      license,
      cnic,
      phNo,
      age,
      experience,
      baseHourlyRate,
      baseDailyRate,
      currentPromotion,
      blackoutDates,
      
    } = req.body;

    console.log(req.body);

    
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const existingDriver = await Driver.findById(id);
    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Format phone number
    const formattedPhNo = phNo ? phNo.replace(/\s/g, '') : existingDriver.phNo;
    const cleanNumber = formattedPhNo.replace(/[^\d+]/g, '');
    if (!cleanNumber.match(/^((\+92|0)3[0-9]{9})$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Please use format: +923XX-XXXXXXX or 03XX-XXXXXXX"
      });
    }

    // Check for duplicates
    if (license || cnic) {
      const duplicateDriver = await Driver.findOne({
        _id: { $ne: id },
        $or: [
          ...(license ? [{ license: license.toUpperCase() }] : []),
          ...(cnic ? [{ cnic }] : [])
        ]
      });

      if (duplicateDriver) {
        return res.status(400).json({
          success: false,
          message: "Driver with this license or CNIC already exists"
        });
      }
    }

    // Handle image upload
    let profileImageUrl = existingDriver.profileimg;
    if (req.files?.profileimg?.length > 0) {
      try {
        const result = await uploadOnCloudinary(req.files.profileimg[0].buffer);
        if (!result?.url) {
          throw new Error('Failed to upload profile image');
        }
        profileImageUrl = result.url;
      } catch (err) {
        console.error("Image upload error:", err);
        return res.status(500).json({
          success: false,
          message: "Profile image upload failed"
        });
      }
    }

    // Build update object
    const updateData = {
      ...(name && { name }),
      ...(license && { license: license.toUpperCase() }),
      ...(cnic && { cnic }),
      ...(phNo && { phNo: formattedPhNo }),
      ...(age && { age }),
      ...(experience && { experience }),
      ...(baseHourlyRate && { baseHourlyRate }),
      ...(baseDailyRate && { baseDailyRate }),
      ...(currentPromotion && { currentPromotion }),
      ...(req.body.availability && { availability: req.body.availability }),
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
      status: { $in: ['pending', 'confirmed', 'ongoing'] }
    });
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete driver with active bookings",
        activeBookingsCount: activeBookings.length
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

exports.getAvailableDriversByDate = async (req, res) => {
  try {

    const { startDate, endDate, company } = req.query;
console.log(req.query)
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both startDate and endDate are required' 
      });
    }

    // Parse dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Please use ISO format (e.g., 2025-05-06T10:00:00Z)' 
      });
    }

    if (startDateTime >= endDateTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'endDate must be after startDate' 
      });
    }

    // Validate company ID if provided
    if (company) {
      if (!mongoose.Types.ObjectId.isValid(company)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid company ID format' 
        });
      }

      // Check if company exists
      const companyExists = await RentalCompany.exists({ _id: company });
      if (!companyExists) {
        return res.status(404).json({ 
          success: false, 
          message: 'Company not found' 
        });
      }
    }

    // Build query
    const query = company ? { company } : {};

    // Find available drivers
    const drivers = await Driver.find(query)
      .populate('bookings')
      .populate('currentAssignment.booking');

    const availableDrivers = drivers.filter(driver => {
      // Check availability for each day in the range
      let currentDate = new Date(startDateTime);
      while (currentDate <= endDateTime) {
        const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' });
        
        if (!driver.availability.days.includes(dayName)) {
          return false;
        }

        // Check time window
        const [startHour, startMin] = driver.availability.startTime.split(':').map(Number);
        const [endHour, endMin] = driver.availability.endTime.split(':').map(Number);
        
        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMin, 0, 0);
        
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        if (currentDate.getDate() === startDateTime.getDate()) {
          if (startDateTime < dayStart || startDateTime > dayEnd) return false;
        }
        
        if (currentDate.getDate() === endDateTime.getDate()) {
          if (endDateTime < dayStart || endDateTime > dayEnd) return false;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Check for booking conflicts
      const hasBookingConflict = driver.bookings.some(booking => {
        return (booking.startTime < endDateTime && booking.endTime > startDateTime);
      });

      // Check current assignment
      const hasAssignmentConflict = driver.currentAssignment && 
        driver.currentAssignment.endTime > startDateTime;

      return !hasBookingConflict && !hasAssignmentConflict;
    });

    return res.status(200).json({ 
      success: true, 
      count: availableDrivers.length, 
      data: availableDrivers 
    });

  } catch (error) {
    console.error('Error fetching available drivers:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error while fetching available drivers' 
    });
  }
};