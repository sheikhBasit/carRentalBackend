const mongoose = require('mongoose');


const authSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    lastLogin:{
        type: Date,
        default: Date.now
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationPasswordToken: Date,
    verificationTokenExpiresAt: Date,
} , {timestamps : true})

const Auth = mongoose.model('Auth', authSchema);
module.exports = Auth;