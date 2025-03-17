const RentalCompany = require('../models/rentalcompany.model.js');
const bcrypt = require('bcrypt');
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js'); // Ensure this file exists

// Create a new rental company
exports.createRentalCompany = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { email, password, city, ...companyData } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCity = city.toLowerCase().replace(/\s+/g, "00");
    console.log("error yahan toh nhi")
    // Check if the company with the same email already exists
    const existingCompany = await RentalCompany.findOne({ email: normalizedEmail });
    if (existingCompany) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Upload CNIC images
    let cnicFrontUrl, cnicBackUrl;
    if (req.files?.cnicFront) {
      const result = await uploadOnCloudinary(req.files.cnicFront[0].path);
      cnicFrontUrl = result?.url;
    }
    if (req.files?.cnicBack) {
      const result = await uploadOnCloudinary(req.files.cnicBack[0].path);
      cnicBackUrl = result?.url;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create rental company
    const rentalCompany = new RentalCompany({
      ...companyData,
      city: normalizedCity,
      email: normalizedEmail,
      password: hashedPassword,
      cnicFrontUrl,
      cnicBackUrl,
    });

    await rentalCompany.save();
    return res.status(201).json({ message: "Rental company created successfully", rentalCompany });
  } catch (error) {
    console.error("Error creating rental company:", error);
    return res.status(500).json({ error: error.message });
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
