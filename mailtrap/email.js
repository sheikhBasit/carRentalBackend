const {PASSWORD_RESET_REQUEST_TEMPLATE , VERIFICATION_EMAIL_TEMPLATE , PASSWORD_RESET_SUCCESS_TEMPLATE } = require('./emailTemplate.js')
const {client , sender} = require("./mailtrap.config.js")

const sendVerificationEmail = async (email , verificationToken) => {
    const recipient = [{email}];

    try{
        const response = await client.send({
            from: sender,
            to: recipient,
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}" , verificationToken),
            category : "Email verification", 
        });
        console.log("Email sent successfully " , response)

    }
    catch(error){
        console.log(`Error sending verification` , error);
        throw new Error(`Error sending verification email: ${error}`);

    }
}

const sendWelcomeEmail = async (email, name) => {
	const recipient = [{ email }];

	try {
		const response = await client.send({
			from: sender,
			to: recipient,
			template_uuid: "963c643f-f684-4c08-86be-7101b94fccc8",
			template_variables: {
				company_info_name: "Auth Company",
				name: name,
			},
		});

		console.log("Welcome email sent successfully", response);
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`);
	}
};


const sendPasswordResetEmail = async (email, resetURL) => {
	const recipient = [{ email }];

	try {
		const response = await client.send({
			from: sender,
			to: recipient,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
			category: "Password Reset",
		});
	} catch (error) {
		console.error(`Error sending password reset email`, error);

		throw new Error(`Error sending password reset email: ${error}`);
	}
};

const sendResetSuccessEmail = async (email) => {
	const recipient = [{ email }];

	try {
		const response = await client.send({
			from: sender,
			to: recipient,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
			category: "Password Reset",
		});

		console.log("Password reset email sent successfully", response);
	} catch (error) {
		console.error(`Error sending password reset success email`, error);

		throw new Error(`Error sending password reset success email: ${error}`);
	}
};

// Generic function to send booking confirmation
const sendBookingConfirmationEmail = async (email, name, bookingDetails, isCompany = false) => {
    const recipient = [{ email }];
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
        <p>Best regards,<br/>Car Rental Team</p>
    `;
    try {
        const response = await client.send({
            from: sender,
            to: recipient,
            subject,
            html,
            category: "Booking Confirmation",
        });
        console.log("Booking confirmation email sent", response);
    } catch (error) {
        console.error(`Error sending booking confirmation email`, error);
        throw new Error(`Error sending booking confirmation email: ${error}`);
    }
};

module.exports = {sendVerificationEmail , sendWelcomeEmail , sendPasswordResetEmail , sendResetSuccessEmail, sendBookingConfirmationEmail}