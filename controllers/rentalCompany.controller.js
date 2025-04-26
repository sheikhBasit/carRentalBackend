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
exports.createRentalCompany = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { email, password, city, ...companyData } = req.body;

    // Validate required fields
    if (!email || !password || !city) {
      return res.status(400).json({ message: 'Email, password, and city are required' });
    }

    // Normalize email and city
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");

    // Check if company exists
    const existingCompany = await RentalCompany.findOne({ email: normalizedEmail });
    if (existingCompany) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Helper function to safely upload files
    const uploadFile = async (file) => {
      if (!file || file.length === 0) return null;
      try {
        const result = await uploadOnCloudinary(file[0].path); // or file[0].buffer if using memory storage
        return result?.url || null;
      } catch (error) {
        console.error(`Error uploading file:`, error);
        return null;
      }
    };

    // Upload all files in parallel
    const [cnicFrontUrl, cnicBackUrl] = await Promise.all([
      uploadFile(req.files?.cnicFront),
      uploadFile(req.files?.cnicBack)
    ]);

    // Validate required documents
    if (!cnicFrontUrl || !cnicBackUrl) {
      return res.status(400).json({ 
        message: 'CNIC (front & back) are required',
        details: {
          cnicFront: !!cnicFrontUrl,
          cnicBack: !!cnicBackUrl
        }
      });
    }

    // Create rental company
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const rentalCompany = new RentalCompany({
      ...companyData,
      city: normalizedCity,
      email: normalizedEmail,
      password: hashedPassword,
      cnicFrontUrl,
      cnicBackUrl,
      // Add any verification tokens if needed
      // verificationToken: generateToken(),
      // verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    await rentalCompany.save();

    // If you need to set cookies or tokens
    // generateTokenAndSetCookie(res, rentalCompany._id);

    // If you want to send verification email
    // sendVerificationEmail(rentalCompany.email, verificationToken)
    //   .catch(emailError => console.error('Email sending error:', emailError));

    res.status(201).json({ 
      success: true,
      message: 'Rental company created successfully', 
      company: { 
        ...rentalCompany.toObject(), 
        password: undefined // Remove sensitive data from response
      } 
    });

  } catch (error) {
    console.error('Error creating rental company:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
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
