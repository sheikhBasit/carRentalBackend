const { 
    PASSWORD_RESET_REQUEST_TEMPLATE, 
    VERIFICATION_EMAIL_TEMPLATE, 
    PASSWORD_RESET_SUCCESS_TEMPLATE 
  } = require('./emailTemplate.js');
  const transporter = require('./email.config');
  
  // 1. Send verification email
  const sendVerificationEmail = async (email, verificationToken) => {
    try {
      const mailOptions = {
        from: `Drive Fleet <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Verify your email",
        html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken)
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Verification email sent successfully", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending verification email", error);
      throw new Error(`Error sending verification email: ${error.message}`);
    }
  };
  
  // 2. Send welcome email
  const sendWelcomeEmail = async (email, name) => {
    try {
      const mailOptions = {
        from: `Drive Fleet <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Welcome to Drive Fleet!",
        html: `
          <h2>Welcome to Drive Fleet, ${name}!</h2>
          <p>Thank you for joining our platform. We're excited to have you on board.</p>
          <p>Start exploring our vehicle rental options and enjoy seamless booking experiences.</p>
          <p>Best regards,<br/>The Drive Fleet Team</p>
        `
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Welcome email sent successfully", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending welcome email", error);
      throw new Error(`Error sending welcome email: ${error.message}`);
    }
  };
  
  // 3. Send password reset email
  const sendPasswordResetEmail = async (email, resetURL) => {
    try {
      const mailOptions = {
        from: `Drive Fleet <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Reset your password",
        html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL)
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Password reset email sent", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending password reset email", error);
      throw new Error(`Error sending password reset email: ${error.message}`);
    }
  };
  
  // 4. Send password reset success email
  const sendResetSuccessEmail = async (email) => {
    try {
      const mailOptions = {
        from: `Drive Fleet <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Password Reset Successful",
        html: PASSWORD_RESET_SUCCESS_TEMPLATE
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Password reset success email sent", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending password reset success email", error);
      throw new Error(`Error sending password reset success email: ${error.message}`);
    }
  };
  
  // 5. Send booking confirmation email
  const sendBookingConfirmationEmail = async (email, name, bookingDetails, isCompany = false) => {
    try {
      const subject = isCompany ? "New Booking Confirmed" : "Your Booking is Confirmed!";
      const html = `
        <h2>${isCompany ? 'A new booking has been confirmed for your vehicle!' : 'Thank you for booking with us!'}</h2>
        <p>Hello ${name || ''},</p>
        <p>${isCompany ? 'Booking details:' : 'Your booking is now confirmed. Here are your details:'}</p>
        <ul>
          <li><strong>Booking ID:</strong> ${bookingDetails._id}</li>
          <li><strong>Vehicle:</strong> ${bookingDetails.vehicleName || ''}</li>
          <li><strong>From:</strong> ${bookingDetails.from}</li>
          <li><strong>To:</strong> ${bookingDetails.to}</li>
        </ul>
        <p>${isCompany ? 'Please prepare the vehicle for the customer.' : 'We look forward to serving you!'}</p>
        <p>Best regards,<br/>Drive Fleet Team</p>
      `;
  
      const mailOptions = {
        from: `Drive Fleet <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log("Booking confirmation email sent", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending booking confirmation email", error);
      throw new Error(`Error sending booking confirmation email: ${error.message}`);
    }
  };
  
  module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendResetSuccessEmail,
    sendBookingConfirmationEmail
  };