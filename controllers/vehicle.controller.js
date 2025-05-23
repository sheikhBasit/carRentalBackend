const RentalCompany = require('../models/rentalcompany.model.js');
const Vehicle = require('../models/vehicle.model.js'); // Ensure correct path
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const fs =  require('fs');
const mongoose =  require('mongoose');
const Booking = require('../models/booking.model.js');

exports.deleteAllVehicles = async (req, res) => {
  try {
      // This would depend on your ORM/query builder
      // For Mongoose: await Vehicle.deleteMany({});
      // For Sequelize: await Vehicle.destroy({ where: {} });
      // For raw SQL: DELETE FROM vehicles;
      
      const result = await Vehicle.deleteMany({}); // Example for Mongoose
      
      res.status(200).json({
          message: `Successfully deleted ${result.deletedCount} vehicles`,
          success: true
      });
  } catch (error) {
      res.status(500).json({
          message: "Error deleting vehicles",
          error: error.message,
          success: false
      });
  }
};

// Create Vehicle (updated to include availability and cities)
// exports.createVehicle = async (req, res) => {
//   try {
//     const { numberPlate, companyId, availability, cities, ...vehicleData } = req.body;

//     if (!companyId) {
//       return res.status(400).json({ message: "Company ID is required" });
//     }
//     console.log(availability)
//     // Validate availability
//     if (!availability ) {
//       return res.status(400).json({ message: "Availability information is required" });
//     }
//     if (!availability.days) {
//       return res.status(400).json({ message: "Availability information days is required" });
//     }
//     if ( !availability.startTime ) {
//       return res.status(400).json({ message: "Availability information  startTime is required" });
//     }
//     if ( !availability.endTime) {
//       return res.status(400).json({ message: "Availability information endTime is required" });
//     }

//     // Validate cities
//     if (!cities || cities.length === 0) {
//       return res.status(400).json({ message: "At least one city must be specified" });
//     }

//     const existingVehicle = await Vehicle.findOne({ numberPlate });
//     if (existingVehicle) {
//       return res.status(400).json({ message: "Vehicle with this number plate already exists" });
//     }

//     // Upload images
//     const carImageUrls = [];
//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const carImageUrl = await uploadOnCloudinary(file.path);
//         if (carImageUrl) {
//           carImageUrls.push(carImageUrl.url);
//         }
    //   }

//     if (carImageUrls.length === 0) {
//       return res.status(400).json({ message: "At least one car image is required" });
//     }

//     // Create new vehicle
//     const vehicle = new Vehicle({
//       ...vehicleData,
//       numberPlate,
//       company: companyId,
//       carImageUrls,
//       availability,
//       cities,
//     });

//     await vehicle.save();

//     return res.status(201).json({
//       message: "Vehicle created successfully",
//       vehicle,
//     });
//   } catch (error) {
//     console.error("Error creating vehicle:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };

exports.  createVehicle = async (req, res) => {
  try {
    const {
      numberPlate,
      companyId,
      manufacturer,
      model,
      year,
      rent,
      transmission,
      fuelType,
      capacity,
      vehicleType,
      features,
      characteristics,
      mileage,
      lastServiceDate,
      availability,
      cities,
      currentLocation,
      blackoutDates,
      minimumRentalHours,
      maximumRentalDays,
      insuranceExpiry
    } = req.body;
    console.log(req.body)
    // Validate required fields
    if (!companyId || !numberPlate || !manufacturer || !model || !year || !rent || 
       !fuelType || !vehicleType ) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      });
    }
    

    // Validate availability
    if (!availability || !availability.days || !availability.startTime || !availability.endTime) {
      return res.status(400).json({ 
        success: false,
        message: "Complete availability information is required (days, startTime, endTime)" 
      });
    }

    // Validate cities
    if (!cities || cities.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "At least one city must be specified" 
      });
    }

    // Check for existing vehicle
    const existingVehicle = await Vehicle.findOne({ numberPlate });
    if (existingVehicle) {
      return res.status(400).json({ 
        success: false,
        message: "Vehicle with this number plate already exists" 
      });
    }

    // Upload images
    const carImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          console.log("here")
          console.log(file)
          const result = await uploadOnCloudinary(file.buffer);
          console.log(result)
          if (result?.url) {
            carImageUrls.push(result.url);
          }
        } catch (uploadError) {
          console.error("Error uploading vehicle image:", uploadError);
          continue;
        }
      }
    }

    if (carImageUrls.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "At least one valid car image is required" 
      });
    }

    // Create new vehicle
    const vehicle = new Vehicle({
      company: companyId,
      numberPlate: numberPlate.toUpperCase(),
      manufacturer: manufacturer.toLowerCase(),
      model: model.toLowerCase(),
      year,
      carImageUrls,
      rent,
      characteristics,
      transmission,
      capacity,
      fuelType,
      vehicleType,
      features: features || [],
      mileage: mileage || 0,
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : undefined,
      availability,
      cities,
      currentLocation: currentLocation || { type: 'Point', coordinates: [0, 0] },
      blackoutDates: blackoutDates || [],
      minimumRentalHours: minimumRentalHours || 4,
      maximumRentalDays: maximumRentalDays || 30,
      insurance: {
        expiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined
      },
    });

    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicle: {
        ...vehicle.toObject(),
        __v: undefined
      }
    });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({ 
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while creating the vehicle'
        : error.message 
    });
  }
};

// Get available vehicles (updated to exclude booked vehicles)
exports.getAllVehicles = async (req, res) => {
  try {
    const { 
      city, 
      date, 
      time, 
      manufacturer, 
      vehicleType, 
      minRent, 
      maxRent,
      transmission,
      fuelType,
    } = req.query;

    const normalizedCity = city?.toLowerCase().replace(/\s+/g, "00");

    // Get current bookings to exclude
    const currentBookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { from: { $lte: new Date(date) }, to: { $gte: new Date(date) } },
        { fromTime: { $lte: time }, toTime: { $gte: time } }
      ]
    }).select('idVehicle');

    const bookedVehicleIds = currentBookings.map(b => b.idVehicle);

    const matchStage = {
      _id: { $nin: bookedVehicleIds }
    };

    // Add filters based on query parameters
    if (normalizedCity) {
      matchStage["company.city"] = normalizedCity;
    }
    if (date) {
      matchStage["availability.days"] = { 
        $in: [new Date(date).toLocaleString('en-US', { weekday: 'long' })] 
      };
    }
    if (time) {
      matchStage["availability.startTime"] = { $lte: time };
      matchStage["availability.endTime"] = { $gte: time };
    }
    if (manufacturer) {
      matchStage.manufacturer = manufacturer.toLowerCase();
    }
    if (vehicleType) {
      matchStage.vehicleType = vehicleType;
    }
    if (minRent || maxRent) {
      matchStage.rent = {};
      if (minRent) matchStage.rent.$gte = Number(minRent);
      if (maxRent) matchStage.rent.$lte = Number(maxRent);
    }
    if (transmission) {
      matchStage.transmission = transmission;
    }
    if (fuelType) {
      matchStage.fuelType = fuelType;
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
          foreignField: "idVehicle",
          as: "bookings",
          pipeline: [
            { $match: { status: "completed" } }
          ]
        }
      },
      {
        $addFields: {
          trips: { $size: "$bookings" },
          isInsuranceValid: { $gt: ["$insurance.expiry", new Date()] }      }
      },
      {
        $project: {
          __v: 0,
          "bookings": 0
        }
      }
    ];

    const vehicles = await Vehicle.aggregate(aggregationPipeline);

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No available vehicles found" + 
          (city ? ` in ${city}` : '') +
          (date ? ` on ${date}` : '') +
          (time ? ` at ${time}` : '')
      });
    }

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching vehicles'
        : error.message 
    });
  }
};

// Get vehicle by ID (updated to include booking status)
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID"
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
          foreignField: "idVehicle",
          as: "bookings",
          pipeline: [
            { $match: { status: { $in: ['confirmed', 'pending'] } } }
          ]
        }
      },
      {
        $addFields: {
          isInsuranceValid: { $gt: ["$insurance.expiry", new Date()] },    availableDates: {
            $filter: {
              input: "$availability.days",
              as: "day",
              cond: {
                $and: [
                  ...(date ? [{
                    $eq: [
                      "$$day",
                      new Date(date).toLocaleString('en-US', { weekday: 'long' })
                    ]
                  }] : []),
                  ...(time ? [{
                    $and: [
                      { $lte: ["$availability.startTime", time] },
                      { $gte: ["$availability.endTime", time] }
                    ]
                  }] : [])
                ]
              }
            }
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

    const result = await Vehicle.aggregate(aggregationPipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    const vehicle = result[0];
    return res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching the vehicle'
        : error.message
    });
  }
};




// Get all vehicles
exports.getAllCityVehicles = async (req, res) => {
  try {
    const { city } = req.query;
    
    // Validate city parameter
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: "City parameter is required and must be a string" 
      });
    }

    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

    const vehicles = await Vehicle.aggregate([
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
                gmail: 1,
                address: 1,
                phNum: 1,
                bankDetails: 1,
                city: 1
              }
            }
          ]
        }
      },
      { $unwind: "$company" },
      {
        $match: {
          "company.city": normalizedCity,
        }
      }
    ]);

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `No available vehicles found in ${city}` 
      });
    }

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });

  } catch (error) {
    console.error(`Error fetching vehicles for city: ${req.query.city}`, error);
    return res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while fetching vehicles'
        : error.message 
    });
  }
};


// Get vehicles by manufacturer
exports.getVehiclesByManufacturer = async (req, res) => {
  try {
    let { manufacturer } = req.params;
    const { city } = req.query;

    if (!manufacturer) {
      return res.status(400).json({ message: "Manufacturer is required" });
    }

    manufacturer = manufacturer.toLowerCase(); // Ensure lowercase

    let matchQuery = { manufacturer };

    // If city is provided, add it to the query
    if (city) {
      const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");
      
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
                  city: 1
                }
              }
            ]
          }
        },
        { $unwind: "$company" },
        {
          $match: {
            manufacturer: manufacturer,
            "company.city": normalizedCity
          }
        },
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "idVehicle",
            as: "bookings",
            pipeline: [
              {
                $match: {
                  status: "completed"
                }
              }
            ]
          }
        },
        {
          $addFields: {
            trips: { $size: "$bookings" }
          }
        }
      ];

      const vehicles = await Vehicle.aggregate(aggregationPipeline);

      if (!vehicles || vehicles.length === 0) {
        return res.status(404).json({ 
          message: `No ${manufacturer} vehicles found${city ? ` in ${city}` : ''}`
        });
      }

      return res.status(200).json(vehicles);
    }

    // If no city is provided, just query by manufacturer
    const vehicles = await Vehicle.aggregate([
      {
        $match: { manufacturer }
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "idVehicle",
          as: "bookings",
          pipeline: [
            {
              $match: {
                status: "completed"
              }
            }
          ]
        }
      },
      {
        $addFields: {
          trips: { $size: "$bookings" }
        }
      }
    ]);

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ 
        message: `No ${manufacturer} vehicles found`
      });
    }

    return res.status(200).json(vehicles);

  } catch (error) {
    console.error("Error fetching vehicles by manufacturer:", error);
    return res.status(500).json({ error: error.message });
  }
};


exports.fetchAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    return res.status(200).json(vehicles);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



exports.getLikedVehicles = async (req, res) => {
  try {
    const { vehicleIds } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({ message: "Invalid vehicle IDs" });
    }

    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });

    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error fetching liked vehicles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVehicles = async (req,res)=>{
  try{const vehicles = await  Vehicle.find()
  if(!vehicles || vehicles.length ===0) {
    return res.status(404).json({message:"No Vehicle found"})
  }
  return res.status(200).json(vehicles)}
  catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

exports.getCompanyVehicles = async (req, res) => {
  try {
      const { company } = req.query;

      if (!company) {
          return res.status(400).json({ error: "Company name is required" });
      }

      const vehicles = await Vehicle.find({ company });
      if (!vehicles) {
        return res.status(404).json({ error: "Vehicle not found" });
    }

      res.status(200).json({ success: true, vehicles });

  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};



exports.getManufacturers = async (req, res) => {
  try {
    const manufacturers = await Vehicle.distinct("manufacturer"); // Get unique manufacturers
    return res.status(200).json(manufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return res.status(500).json({ error: "Failed to fetch manufacturers" });
  }
};



// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numberPlate,
      manufacturer,
      model,
      capacity,
      characteristics,
      year,
      rent,
      transmission,
      fuelType,
      vehicleType,
      features,
      mileage,
      lastServiceDate,
      availability,
      cities,
      currentLocation,
      blackoutDates,
      minimumRentalHours,
      maximumRentalDays,
      removeImages
    } = req.body;

    console.log("Vehicle update body:", req.body);

    // Validate vehicle ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID"
      });
    }

    const existingVehicle = await Vehicle.findById(id);
    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Check for duplicate number plate
    if (numberPlate && numberPlate !== existingVehicle.numberPlate) {
      const duplicateVehicle = await Vehicle.findOne({ numberPlate });
      if (duplicateVehicle) {
        return res.status(400).json({
          success: false,
          message: "Vehicle with this number plate already exists"
        });
      }
    }

    // Handle image update logic
    let carImageUrls = [...existingVehicle.carImageUrls];

    // Remove selected images
    if (Array.isArray(removeImages)) {
      carImageUrls = carImageUrls.filter(url => !removeImages.includes(url));
    }

    // Upload new images
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          const result = await uploadOnCloudinary(file.buffer);
          if (result?.url) {
            carImageUrls.push(result.url);
          }
        } catch (uploadError) {
          console.error("Error uploading vehicle image:", uploadError);
        }
      }
    }

    // Require at least one image
    if (carImageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one car image is required"
      });
    }

    // Filter blackoutDates (remove past)
    const currentDate = new Date();
    let filteredBlackoutDates = existingVehicle.blackoutDates || [];
    let pastDatesCount = 0;

    if (Array.isArray(blackoutDates)) {
      filteredBlackoutDates = blackoutDates.filter(dateStr => {
        const dateObj = new Date(dateStr);
        if (dateObj > currentDate) return true;
        pastDatesCount++;
        return false;
      });
    }

    // Build update payload safely (avoid skipping falsy but valid values)
    const updateData = {
      ...(numberPlate !== undefined && { numberPlate: numberPlate.toUpperCase() }),
      ...(manufacturer !== undefined && { manufacturer: manufacturer.toLowerCase() }),
      ...(model !== undefined && { model: model.toLowerCase() }),
      ...(capacity !== undefined && { capacity }),
      ...(characteristics !== undefined && { characteristics }),
      ...(year !== undefined && { year }),
      ...(rent !== undefined && { rent }),
      ...(transmission !== undefined && { transmission }),
      ...(fuelType !== undefined && { fuelType }),
      ...(vehicleType !== undefined && { vehicleType }),
      ...(features !== undefined && { features }),
      ...(mileage !== undefined && { mileage }),
      ...(lastServiceDate !== undefined && { lastServiceDate: new Date(lastServiceDate) }),
      ...(availability !== undefined && { availability }),
      ...(cities !== undefined && { cities }),
      ...(currentLocation !== undefined && { currentLocation }),
      ...(minimumRentalHours !== undefined && { minimumRentalHours }),
      ...(maximumRentalDays !== undefined && { maximumRentalDays }),
      blackoutDates: filteredBlackoutDates,
      carImageUrls,
    };

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    const response = {
      success: true,
      message: "Vehicle updated successfully",
      data: updatedVehicle
    };

    if (pastDatesCount > 0) {
      response.warning = `${pastDatesCount} past blackout dates were removed`;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error updating vehicle:", error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred while updating the vehicle'
        : error.message,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error.stack
      })
    });
  }
};

// Update vehicle status
exports.setVehicleStatus = async (req, res) => {
  try {
    // RBAC: Only admin or owning company can update status
    const { id } = req.params;
    const { status } = req.body;
    if (!['available', 'booked', 'under_maintenance', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(id, { status }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    // TODO: Add audit log
    res.json({ success: true, message: 'Status updated', vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Log maintenance event
exports.logMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description, cost } = req.body;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    vehicle.maintenanceLogs.push({ date, description, cost });
    await vehicle.save();
    // TODO: Add audit log
    res.json({ success: true, message: 'Maintenance log added', vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Dynamic Pricing & Discount (admin/company only)
exports.updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { dynamicPricing, discount } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(id, { dynamicPricing, discount }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    // TODO: Add audit log
    res.json({ success: true, message: 'Pricing updated', vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Soft Delete/Restore Vehicle (admin/company only)
exports.softDeleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { isDeleted } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(id, { isDeleted }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    // TODO: Add audit log
    res.json({ success: true, message: `Vehicle ${isDeleted ? 'archived' : 'restored'}`, vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Upload Vehicle Images (admin/company only)
exports.uploadVehicleImages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }
    const urls = [];
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.buffer);
      if (result?.url) urls.push(result.url);
    }
    const vehicle = await Vehicle.findByIdAndUpdate(id, { $push: { images: { $each: urls } } }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    // TODO: Add audit log
    res.json({ success: true, message: 'Images uploaded', vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Search/Filter Vehicles (public)
exports.searchVehicles = async (req, res) => {
  try {
    const query = {};
    const { status, minPrice, maxPrice, features, seats, fuelType, transmission, city } = req.query;
    if (status) query.status = status;
    if (typeof seats !== 'undefined') query['features.seats'] = Number(seats);
    if (fuelType) query['features.fuelType'] = fuelType;
    if (transmission) query['features.transmission'] = transmission;
    if (city) query['cities.name'] = city;
    if (features) {
      // features=ac,bluetooth,gps
      const arr = features.split(',');
      arr.forEach(f => query[`features.${f}`] = true);
    }
    if (minPrice || maxPrice) {
      query['dynamicPricing.baseRate'] = {};
      if (minPrice) query['dynamicPricing.baseRate'].$gte = Number(minPrice);
      if (maxPrice) query['dynamicPricing.baseRate'].$lte = Number(maxPrice);
    }
    const vehicles = await Vehicle.find(query);
    res.json({ success: true, vehicles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Delete this ",id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID"
      });
    }
    // Check if vehicle exists
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }
    // Check for active bookings
    const activeBookings = await Booking.find({ idVehicle: id, status: { $in: ['pending', 'confirmed', 'ongoing'] } });
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete vehicle with active bookings"
      });
    }
    // Delete the vehicle
    await Vehicle.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while deleting the vehicle'
        : error.message
    });
  }
};
