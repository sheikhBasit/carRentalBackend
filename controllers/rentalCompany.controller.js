const RentalCompany = require('../models/rentalcompany.model.js');
const bcrypt = require('bcrypt');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js'); // Ensure this file exists

// Create a new rental company
// exports.createRentalCompany = async (req, res) => {
//   try {
//     console.log("Request body:", req.body);
//     console.log("Request files:", req.files);

//     const { email, password, city, ...companyData } = req.body;
//     const normalizedEmail = email.trim().toLowerCase();
//     const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");
//     console.log("error yahan toh nhi")
//     // Check if the company with the same email already exists
//     const existingCompany = await RentalCompany.findOne({ email: normalizedEmail });
//     if (existingCompany) {
//       return res.status(400).json({ message: "Email already in use" });
//     }

//     // Upload CNIC images
//     let cnicFrontUrl, cnicBackUrl;
//     if (req.files?.cnicFront) {
//       const result = await uploadOnCloudinary(req.files.cnicFront[0].path);
//       cnicFrontUrl = result?.url;
//     }
//     if (req.files?.cnicBack) {
//       const result = await uploadOnCloudinary(req.files.cnicBack[0].path);
//       cnicBackUrl = result?.url;
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create rental company
//     const rentalCompany = new RentalCompany({
//       ...companyData,
//       city: normalizedCity,
//       email: normalizedEmail,
//       password: hashedPassword,
//       cnicFrontUrl,
//       cnicBackUrl,
//     });

//     await rentalCompany.save();
//     return res.status(201).json({ message: "Rental company created successfully", rentalCompany });
//   } catch (error) {
//     console.error("Error creating rental company:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };
const RentalCompany = require('../models/rentalCompany.model');
const bcrypt = require('bcrypt');
const { uploadOnCloudinary } = require('../utils/cloudinary');

exports.createRentalCompany = async (req, res) => {
  try {
    console.log("Incoming request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    // Validate required fields
    const requiredFields = ['email', 'password', 'city', 'companyName', 'phNum', 'cnic', 'address', 'province'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const { email, password, city, ...companyData } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

    // Check if company exists
    const existingCompany = await RentalCompany.findOne({ email: normalizedEmail });
    if (existingCompany) {
      return res.status(409).json({ 
        success: false,
        message: "Email already in use" 
      });
    }

    // File upload validation
    if (!req.files?.cnicFront || !req.files?.cnicBack) {
      return res.status(400).json({
        success: false,
        error: 'Both CNIC front and back images are required'
      });
    }

    // Upload files to Cloudinary
    const uploadFile = async (file) => {
      try {
        // Ensure file exists and has path property
        if (!file || !file[0] || !file[0].path) {
          throw new Error('Invalid file upload');
        }
        
        const result = await uploadOnCloudinary(file[0].path);
        if (!result?.url) throw new Error('Failed to upload file to Cloudinary');
        return result.url;
      } catch (error) {
        console.error('File upload error:', error);
        throw error;
      }
    };

    const [cnicFrontUrl, cnicBackUrl] = await Promise.all([
      uploadFile(req.files.cnicFront),
      uploadFile(req.files.cnicBack)
    ]);

    // Create company
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const rentalCompany = new RentalCompany({
      ...companyData,
      city: normalizedCity,
      email: normalizedEmail,
      password: hashedPassword,
      cnicFrontUrl,
      cnicBackUrl,
      isVerified: false // Add verification status
    });

    await rentalCompany.save();

    // Remove sensitive data from response
    const companyResponse = rentalCompany.toObject();
    delete companyResponse.password;
    delete companyResponse.__v;

    res.status(201).json({
      success: true,
      message: "Rental company created successfully",
      company: companyResponse
    });

  } catch (error) {
    console.error("Error creating rental company:", error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.name === 'ValidationError') statusCode = 400;
    if (error.message.includes('duplicate key')) statusCode = 409;
    
    res.status(statusCode).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'An error occurred during registration' 
        : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
  }
};
// Get all rental companies
exports.getAllRentalCompanies = async (req, res) => {
  try {
    const companies = await RentalCompany.find();
    return res.status(200).json(companies);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get a single rental company by ID
exports.getRentalCompanyById = async (req, res) => {
  try {
    console.log(req.params.id);
    const company = await RentalCompany.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Rental company not found' });
    return res.status(200).json(company);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getRentalCompanyByEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    
    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find the rental company by email
    const company = await RentalCompany.findOne({ email:email.trim().toLowerCase() });
    console.log(company)
    if (!company) {
      return res.status(404).json({ message: 'Rental company not found' });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful authentication response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      company, // Corrected this part
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Update a rental company
exports.updateRentalCompany = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    console.log(req.body);
    
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const company = await RentalCompany.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!company) return res.status(404).json({ message: 'Rental company not found' });
    return res.status(200).json({ message: 'Rental company updated successfully', company });
  } catch (error) {
    return   res.status(400).json({ error: error.message });
  }
};

// Delete a rental company
exports.deleteRentalCompany = async (req, res) => {
  try {
    const company = await RentalCompany.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Rental company not found' });
    return res.status(200).json({ message: 'Rental company deleted successfully' });
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};
