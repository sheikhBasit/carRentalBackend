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
//       }
//     }

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
//       isAvailable: true
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

exports.createVehicle = async (req, res) => {
  try {
    const { numberPlate, companyId, availability, cities, ...vehicleData } = req.body;

    // Validate required fields
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Validate availability
    if (!availability || 
        !availability.days || 
        !availability.startTime || 
        !availability.endTime) {
      return res.status(400).json({ 
        message: "Complete availability information is required (days, startTime, endTime)" 
      });
    }

    // Validate cities
    if (!cities || cities.length === 0) {
      return res.status(400).json({ message: "At least one city must be specified" });
    }

    // Check for existing vehicle
    const existingVehicle = await Vehicle.findOne({ numberPlate });
    if (existingVehicle) {
      return res.status(400).json({ 
        message: "Vehicle with this number plate already exists" 
      });
    }

    // Upload images using buffers
    const carImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadOnCloudinary(file.buffer); // Use buffer instead of path
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
        message: "At least one valid car image is required" 
      });
    }

    // Create new vehicle
    const vehicle = new Vehicle({
      ...vehicleData,
      numberPlate,
      company: companyId,
      carImageUrls,
      availability,
      cities,
      isAvailable: true
    });

    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicle: {
        ...vehicle.toObject(),
        __v: undefined // Remove version key from response
      },
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
    const { city, date, time } = req.query;
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
          isAvailable: true,
          _id: { $nin: bookedVehicleIds },
          ...(normalizedCity && { "company.city": normalizedCity }),
          ...(date && { 
            "availability.days": { 
              $in: [new Date(date).toLocaleString('en-US', { weekday: 'long' })] 
            } 
          }),
          ...(time && {
            "availability.startTime": { $lte: time },
            "availability.endTime": { $gte: time }
          })
        }
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "idVehicle",
          as: "bookings",
          pipeline: [
            { $match: { status: "confirmed" } }
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
        message: "No available vehicles found" + 
          (city ? ` in ${city}` : '') +
          (date ? ` on ${date}` : '') +
          (time ? ` at ${time}` : '')
      });
    }

    return res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get vehicle by ID (updated to include booking status)
exports.getVehicleById = async (req, res) => {
  try {
    const { date, time } = req.query;
    const vehicleId = req.params.id;

    const aggregationPipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(vehicleId) }
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
          isAvailable: {
            $cond: {
              if: { $gt: [{ $size: "$bookings" }, 0] },
              then: false,
              else: true
            }
          },
          availableDates: {
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
      }
    ];

    const result = await Vehicle.aggregate(aggregationPipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicle = result[0];
    return res.status(200).json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({ error: error.message });
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
          isAvailable: true // Consider adding availability filter
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
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.status(200).json({ message: 'Vehicle updated successfully', vehicle });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
