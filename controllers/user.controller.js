const User = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Added for reset token generation
const { uploadOnCloudinary } = require('../utils/connectCloudinary.js');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} = require('../mailtrap/email.js');
const generateTokenAndSetCookie = require('../utils/generateTokenAndSetCookie.js');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if the user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Upload images to Cloudinary
    const cnicFrontUrl = req.files?.cnicFront?.length > 0
      ? await uploadOnCloudinary(req.files.cnicFront[0].path)
      : null;
    const cnicBackUrl = req.files?.cnicBack?.length > 0
      ? await uploadOnCloudinary(req.files.cnicBack[0].path)
      : null;
    const licenseFrontUrl = req.files?.licenseFront?.length > 0
      ? await uploadOnCloudinary(req.files.licenseFront[0].path)
      : null;
    const licenseBackUrl = req.files?.licenseBack?.length > 0
      ? await uploadOnCloudinary(req.files.licenseBack[0].path)
      : null;
      const profilePic = req.files?.profilePic?.length > 0
      ? await uploadOnCloudinary(req.files.profilePic[0].path)
      : null;
    // Validate required images
    if (!cnicFrontUrl || !cnicBackUrl || !licenseFrontUrl || !licenseBackUrl || !profilePic) {
      return res.status(400).json({ message: 'All required images (CNIC & License) must be uploaded' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const normalizedEmail = email.trim().toLowerCase();

    // Create new user
    const user = new User({
      ...userData,
      email:normalizedEmail,
      password: hashedPassword,
      cnicFrontUrl: cnicFrontUrl.url,
      cnicBackUrl: cnicBackUrl.url,
      licenseFrontUrl: licenseFrontUrl.url,
      licenseBackUrl: licenseBackUrl.url,
      profilePic: profilePic.url,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await user.save();
    generateTokenAndSetCookie(res, user._id);

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({ message: 'User created successfully', user: { ...user._doc, password: undefined } });
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -verificationToken -verificationTokenExpiresAt');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -verificationToken -verificationTokenExpiresAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(user.fcmToken);
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    console.log('Update Data:', req.body);
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password -verificationToken -verificationTokenExpiresAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
	const { code } = req.body;
  
	if (!code) {
	  return res.status(400).json({ success: false, message: 'Verification code is required' });
	}
  
	try {
	  // Find the user with the provided verification code and ensure the token has not expired
	  const user = await User.findOne({
		verificationToken: code,
		verificationTokenExpiresAt: { $gt: Date.now() }, // Ensure the token is not expired
	  });
  
	  if (!user) {
		return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
	  }
  
	  // Update user as verified
	  user.isVerified = true;
	  user.verificationToken = undefined; // Clear the verification token
	  user.verificationTokenExpiresAt = undefined; // Clear the expiration time
	  await user.save();
  
	  // Send welcome email
	  try {
		await sendWelcomeEmail(user.email, user.name);
	  } catch (emailError) {
		console.error('Error sending welcome email:', emailError.message);
	  }
  
	  // Return success response with user data (excluding sensitive fields)
	  const { password, verificationToken, verificationTokenExpiresAt, ...userSafeData } = user._doc;
  
    return res.status(200).json({
		success: true,
		message: 'Email verified successfully',
		user: userSafeData,
	  });
	} catch (error) {
	  console.error('Error in verifyEmail:', error);
	  return  res.status(500).json({ success: false, message: 'Server error' });
	}
  };
// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email:normalizedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is not verified' });
    }

    generateTokenAndSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Logout
exports.logout = async (req, res) => {
  return res.clearCookie('token');
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;
    await user.save();

    await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

    return res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return  res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check authentication
exports.checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error in checkAuth:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};