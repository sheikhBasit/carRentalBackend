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
// Create a new user with only profile picture upload
exports.createUser = async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Helper function to safely upload profile picture
    const uploadProfilePic = async (file) => {
      if (!file || file.length === 0) return null;
      try {
        const result = await uploadOnCloudinary(file[0].path);
        return result?.url || null;
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        return null;
      }
    };

    // Upload only profile picture
    const profilePicUrl = await uploadProfilePic(req.files?.profilePic);

    // Create user (profile picture is optional)
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const normalizedEmail = email.trim().toLowerCase();

    const user = new User({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      profilePic: profilePicUrl || undefined, // Set to undefined if no picture
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    await user.save();
    generateTokenAndSetCookie(res, user._id);

    // Send verification email (don't await to speed up response)
    sendVerificationEmail(user.email, verificationToken)
      .catch(emailError => console.error('Email sending error:', emailError));

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { 
        ...user.toObject(), 
        password: undefined,
        verificationToken: undefined
      } 
    });

  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
// // Create a new user
// exports.createUser = async (req, res) => {
//   try {
//     const { email, password, ...userData } = req.body;

//     // Validate required fields
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     // Check if user exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already in use' });
//     }

//     // Helper function to safely upload files
//     const uploadFile = async (file) => {
//       if (!file || file.length === 0) return null;
//       try {
//         const result = await uploadOnCloudinary(file[0].path);
//         return result?.url || null;
//       } catch (error) {
//         console.error(`Error uploading ${file[0].fieldname}:`, error);
//         return null;
//       }
//     };

//     // Upload all files in parallel
//     const [
//       // cnicFrontUrl,
//       // cnicBackUrl,
//       // licenseFrontUrl,
//       // licenseBackUrl,
//       profilePicUrl
//     ] = await Promise.all([
//       // uploadFile(req.files?.cnicFront),
//       // uploadFile(req.files?.cnicBack),
//       // uploadFile(req.files?.licenseFront),
//       // uploadFile(req.files?.licenseBack),
//       uploadFile(req.files?.profilePic)
//     ]);

//     // Validate required images
//     if (!cnicFrontUrl || !cnicBackUrl || !licenseFrontUrl || !licenseBackUrl || !profilePicUrl) {
//       return res.status(400).json({ 
//         message: 'All required images (CNIC & License) must be uploaded',
//         details: {
//           // cnicFront: !!cnicFrontUrl,
//           // cnicBack: !!cnicBackUrl,
//           // licenseFront: !!licenseFrontUrl,
//           // licenseBack: !!licenseBackUrl,
//           profilePic: !!profilePicUrl
//         }
//       });
//     }

//     // Create user
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
//     const normalizedEmail = email.trim().toLowerCase();

//     const user = new User({
//       ...userData,
//       email: normalizedEmail,
//       password: hashedPassword,
//       cnicFrontUrl,
//       cnicBackUrl,
//       licenseFrontUrl,
//       licenseBackUrl,
//       profilePic: profilePicUrl,
//       verificationToken,
//       verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
//     });

//     await user.save();
//     generateTokenAndSetCookie(res, user._id);

//     // Send verification email (don't await to speed up response)
//     sendVerificationEmail(user.email, verificationToken)
//       .catch(emailError => console.error('Email sending error:', emailError));

//     res.status(201).json({ 
//       message: 'User created successfully', 
//       user: { 
//         ...user.toObject(), 
//         password: undefined,
//         verificationToken: undefined
//       } 
//     });

//   } catch (error) {
//     console.error('Error in createUser:', error);
//     res.status(500).json({ 
//       message: 'Server error', 
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// };
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