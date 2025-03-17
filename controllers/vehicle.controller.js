const RentalCompany = require('../models/rentalcompany.model.js');
const Vehicle = require('../models/vehicle.model.js'); // Ensure correct path
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const fs =  require('fs');

// Create Vehicle
exports.createVehicle = async (req, res) => {
  try {
    console.log(req.body);
    console.log("req.files", req.files); // Debugging - See what file is received

    const { numberPlate, companyId, ...vehicleData } = req.body; // Ensure companyId is extracted

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Check if a vehicle with the same number plate exists
    const existingVehicle = await Vehicle.findOne({ numberPlate });
    if (existingVehicle) {
      return res.status(400).json({ message: "Vehicle with this number plate already exists" });
    }

    let carImageLocalPath;
    if (req.files?.carImage?.length > 0) {
      carImageLocalPath = req.files.carImage[0].path;
    }

    if (!carImageLocalPath) {
      return res.status(400).json({ message: "Car image is required" });
    }

    // Upload to Cloudinary
    const carImageUrl = await uploadOnCloudinary(carImageLocalPath);
    if (!carImageUrl) {
      return res.status(500).json({ message: "Image upload failed" });
    }

    // Save to DB
    const vehicle = new Vehicle({
      ...vehicleData,
      numberPlate,
      company: companyId, // Ensure company ID is assigned
      carImageUrl: carImageUrl.url, // Store Cloudinary URL in DB
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
exports.getAllVehicles = async (req, res) => {
  try {
    const { city } = req.query; // Extract city from query parameters
    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

    const vehicles = await Vehicle.aggregate([
      {
        $lookup: {
          from: "rentalcompanies", // Ensure correct collection name
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [
            {
              $project: {
                companyName: 1,
                gmail: 1,
                address: 1,
                phNo: 1,
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
          "company.city": normalizedCity
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
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    return res.status(200).json(vehicle);
  } catch (error) {
    return  res.status(500).json({ error: error.message });
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
