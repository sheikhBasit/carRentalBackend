const { MailtrapClient } = require("mailtrap");

const client = new MailtrapClient({
  endpoint: process.env.MAILTRAP_ENDPOINT,
  token: process.env.MAILTRAP_TOKEN,
});


const sender = {
  email: "mailtrap@satraders.co",
  name: "Mailtrap Test",
};


module.exports = {client , sender}


