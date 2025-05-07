const { MailtrapClient } = require("mailtrap");
const nodemailer = require('nodemailer');

const client = new MailtrapClient({
  endpoint: process.env.MAILTRAP_ENDPOINT,
  token: process.env.MAILTRAP_TOKEN,
});


const sender = {
  email: "mailtrap@satraders.co",
  name: "Mailtrap Test",
};

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

module.exports = {client , sender , transporter}


