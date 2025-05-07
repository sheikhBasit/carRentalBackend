const RentalCompany = require('../models/rentalcompany.model.js');
const bcrypt = require('bcrypt');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js'); // Ensure this file exists
const jwt = require('jsonwebtoken');
const generateTokenAndSetCookie = require('../utils/generateTokenAndSetCookie.js');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} = require('../mailtrap/email.js');
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

    // Upload files to Cloudinary using buffers (consistent with company signup)
    const uploadFile = async (file) => {
      try {
        if (!file || file.length === 0) return null;
        const result = await uploadOnCloudinary(file[0].buffer); // Use buffer instead of path
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
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    const rentalCompany = new RentalCompany({
      ...companyData,
      city: normalizedCity,
      email: normalizedEmail,
      password: hashedPassword,
      cnicFrontUrl,
      cnicBackUrl,
      isVerified: false,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    await rentalCompany.save();
    generateTokenAndSetCookie(res, rentalCompany._id);

    // Remove sensitive data from response
    const companyResponse = rentalCompany.toObject();
    delete companyResponse.password;
    delete companyResponse.__v;
    let emailSent = false;
    let emailError = null;
    try {
      await sendVerificationEmail(rentalCompany.email, verificationToken);
      emailSent = true;
    } catch (emailError) {
      emailError = emailError;
      console.error('Email sending error:', emailError);
    }

    res.status(201).json({
      success: true,
      emailSent,
      emailError,
      message: "Rental company created successfully",
      company: companyResponse
    });

  } catch (error) {
    console.error("Error creating rental company:", error);
    
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

// Verify email
exports.verifyEmail = async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Verification code is required' });
  }
  
  try {
    // Find the company with the provided verification code and ensure the token has not expired
    const company = await RentalCompany.findOne({
    verificationToken: code,
    verificationTokenExpiresAt: { $gt: Date.now() }, // Ensure the token is not expired
    });
  
    if (!company) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }
  
    // Update company as verified
    company.isVerified = true;
    company.verificationToken = undefined; // Clear the verification token
    company.verificationTokenExpiresAt = undefined; // Clear the expiration time
    await company.save();
  
    // Send welcome email
    try {
    await sendWelcomeEmail(company.email, company.companyName);
    } catch (emailError) {
    console.error('Error sending welcome email:', emailError.message);
    }
  
    // Return success response with company data (excluding sensitive fields)
    const { password, verificationToken, verificationTokenExpiresAt, ...companySafeData } = company._doc;
  
    return res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    company: companySafeData,
    });
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    return  res.status(500).json({ success: false, message: 'Server error' });
  }
  };

  // Add to companyController.js
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const company = await RentalCompany.findOne({ email });
    if (!company) {
      return res.status(404).json({ success: false, message: 'company not found' });
    }

    if (company.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    // Generate new verification code (6 digits)
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    company.verificationCode = newCode;
    await company.save();

    // In a real app, you would send this code via email
    console.log(`New verification code for ${email}: ${newCode}`);

    res.status(200).json({
      success: true,
      message: 'New verification code sent'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend verification code',
      error: error.message 
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
   // Generate JWT
        const token = jwt.sign({ id: company._id, role: "company" }, process.env.JWT_SECRET, { expiresIn: '1d' });
        // Set cookie for cross-site usage
        res.cookie('token', token, {
            httpOnly: true,
            secure: true, // Only send cookie on HTTPS
            sameSite: 'none', // Allow cross-site
            maxAge: 24 * 60 * 60 * 1000
        });
     
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
    const companyId = req.params.id;
    // Check for active bookings for any vehicles owned by this company
    const Vehicle = require('../models/vehicle.model.js');
    const Booking = require('../models/booking.model.js');
    // Find all vehicles owned by this company
    const vehicles = await Vehicle.find({ company: companyId }, '_id');
    const vehicleIds = vehicles.map(v => v._id);
    // Check for active bookings for any of these vehicles
    const activeBookings = await Booking.find({ idVehicle: { $in: vehicleIds }, status: { $in: ['pending', 'confirmed', 'ongoing'] } });
    if (activeBookings.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete rental company with active bookings for its vehicles',
        activeBookingsCount: activeBookings.length
      });
    }
    const company = await RentalCompany.findByIdAndDelete(companyId);
    if (!company) return res.status(404).json({ message: 'Rental company not found' });
    return res.status(200).json({ message: 'Rental company deleted successfully' });
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};
