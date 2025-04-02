const RentalCompany = require('../models/rentalcompany.model.js');
const Vehicle = require('../models/vehicle.model.js'); // Ensure correct path
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const fs =  require('fs');
const mongoose =  require('mongoose');

// Create Vehicle
exports.createVehicle = async (req, res) => {
  try {
    console.log(req.body);
    console.log("req.files", req.files); // Debugging - See what files are received

    const { numberPlate, companyId, ...vehicleData } = req.body; // Ensure companyId is extracted

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Check if a vehicle with the same number plate exists
    const existingVehicle = await Vehicle.findOne({ numberPlate });
    if (existingVehicle) {
      return res.status(400).json({ message: "Vehicle with this number plate already exists" });
    }

    // Upload multiple images to Cloudinary
    const carImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const carImageUrl = await uploadOnCloudinary(file.path);
        if (carImageUrl) {
          carImageUrls.push(carImageUrl.url);
        }
      }
    }

    if (carImageUrls.length === 0) {
      return res.status(400).json({ message: "At least one car image is required" });
    }

    // Save to DB
    const vehicle = new Vehicle({
      ...vehicleData,
      numberPlate,
      company: companyId, // Ensure company ID is assigned
      carImageUrls, // Store array of Cloudinary URLs in DB
    });

    await vehicle.save();

    return res.status(201).json({
      message: "Vehicle created successfully",
      vehicle,
    });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all vehicles
// exports.getAllVehicles = async (req, res) => {
//   try {
//     const { city } = req.query; // Extract city from query parameters
//     const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

//     const vehicles = await Vehicle.aggregate([
//       {
//         $lookup: {
//           from: "rentalcompanies", // Ensure correct collection name
//           localField: "company",
//           foreignField: "_id",
//           as: "company",
//           pipeline: [
//             {
//               $project: {
//                 companyName: 1,
//                 gmail: 1,
//                 address: 1,
//                 phNum: 1,
//                 bankDetails: 1,
//                 city: 1
//               }
//             }
//           ]
//         }
//       },
//       { $unwind: "$company" }, 
//       {
//         $match: {
//           "company.city": normalizedCity
//         }
//       }
//     ]);

//     if (!vehicles || vehicles.length === 0) {
//       return res.status(404).json({ message: "No Vehicle Found for this city" });
//     }

//     return res.status(200).json(vehicles);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

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


exports.getAllVehicles = async (req, res) => {
  try {
    const { city } = req.query; // Extract city from query parameters
    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

    const vehicles = await Vehicle.aggregate([
      {
        $lookup: {
          from: "rentalcompanies", // Join with rental companies
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
      { $unwind: "$company" }, // Unwind the company array
      {
        $match: {
          "company.city": normalizedCity // Filter by city
        }
      },
      {
        $lookup: {
          from: "bookings", // Join with bookings
          localField: "_id",
          foreignField: "idVehicle",
          as: "bookings",
          pipeline: [
            {
              $match: {
                status: "completed" // Filter for completed bookings
              }
            }
          ]
        }
      },
      {
        $addFields: {
          trips: { $size: "$bookings" } // Count completed bookings and update trips
        }
      }
    ]);

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: "No Vehicle Found for this city" });
    }

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

// Get a single vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(req.params.id) }, // Match the vehicle by ID
      },
      {
        $lookup: {
          from: "rentalcompanies", // Join with the RentalCompany collection
          localField: "company", // Field in the Vehicle collection
          foreignField: "_id", // Field in the RentalCompany collection
          as: "company", // Output array field
          pipeline: [
            {
              $project: {
                companyName: 1,
                gmail: 1,
                address: 1,
                phNum: 1,
                bankDetails: 1,
                city: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$company" }, // Unwind the company array to get a single object
    ]);

    if (!vehicle || vehicle.length === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.status(200).json(vehicle[0]); // Return the first (and only) vehicle
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
