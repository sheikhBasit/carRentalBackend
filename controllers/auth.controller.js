const bcrypt = require('bcryptjs')
const User = require ('../models/user.model.js')
const {sendVerificationEmail , sendWelcomeEmail , sendPasswordResetEmail , sendResetSuccessEmail} = require("../mailtrap/email.js");
const generateTokenAndSetCookie = require("../utils/generateTokenAndSetCookie.js");
const crypto = require('crypto')



const create = async(req,res) => {
    res.render('index')
}


const signup = async(req, res)=>{
    const {email,password,name, confirmPassword , role , isBlocked , phoneNo , address , city , province , cnic , age} = req.body;
	console.log("req.body",req.body);
    try{
        if(!email||!password||!name ){
            throw new Error("All fields are required");
        }
        const userAlreadyExists = await User.findOne({email});
        console.log("userAlreadyExists" , userAlreadyExists);
        if(userAlreadyExists){
            return res.status(400).json({success:false,message:"User already exists"})
        }
        const hashedPassword = await bcrypt.hash(password,10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new User({
            email,
            password: hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
            role,
            isBlocked,
            phoneNo,
            address,
            city,
            province,
            cnic,
            age,
        })

        await user.save();

        generateTokenAndSetCookie(res , user._id);

        await sendVerificationEmail(user.email , verificationToken);

        res.status(201).json({
            success:true,
            message:"User created successfully",
            user:{
                ...user._doc,
                password:undefined,

            },
        })
    }
    catch(error){
        return res.status(400).json({success:false,message:error.message})

    }
}


const verifyEmail = async (req, res) => {
	const { code } = req.body;

	if (!code) {
		return res.status(400).json({ success: false, message: "Verification code is required" });
	}

	try {
		// Find the user with the provided verification code and ensure the token has not expired
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		// Update user as verified
		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		// Attempt to send a welcome email
		try {
			await sendWelcomeEmail(user.email, user.name);
		} catch (emailError) {
			console.error("Error sending welcome email:", emailError.message);
		}

		// Return success response with user data (excluding sensitive fields)
		const { password, verificationToken, verificationTokenExpiresAt, ...userSafeData } = user._doc;

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: userSafeData,
		});
	} catch (error) {
		console.error("Error in verifyEmail:", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

const login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		if(!user.isVerified){
			return res.status(400).json({ success: false, message: "Email is not verified" });
		
		}
		generateTokenAndSetCookie(res, user._id);

		user.lastLogin = new Date();
		await user.save();

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("Error in login ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};




const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};


const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcrypt.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};



module.exports = {signup , login , logout ,create , verifyEmail , forgotPassword , resetPassword , checkAuth}