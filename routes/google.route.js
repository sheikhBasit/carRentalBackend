const { OAuth2Client } = require("google-auth-library");
const express = require("express");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const User = require("../models/user.model");   

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google-login", async (req, res) => {
    const { idToken } = req.body;
  
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
  
      const payload = ticket.getPayload();
      const { sub, email, name, picture } = payload;
  
      // Check if user exists by Google ID or email
      let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
  
      if (!user) {
        user = await User.create({
          name: name || "Google User",
          email,
          googleId: sub,
          profilePic: picture || "",
          password: "GOOGLE_AUTH", 
          phoneNo: "0000000000",   
          address: "Not Provided",
          city: "lahore",
          province: "punjab", 
          age: 18, 
          role: "customer",
          isVerified: true,
        });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
  
      res.status(200).json({
        token,
        user,
      });
  
    } catch (err) {
      console.error("Google login error:", err.message);
      res.status(400).json({ message: "Google login failed" });
    }
  });
  
module.exports = router;
