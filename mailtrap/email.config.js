// email.config.js
const nodemailer = require('nodemailer');

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD
  }
});

module.exports = transporter;