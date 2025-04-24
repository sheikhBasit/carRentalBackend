const serverless = require('serverless-http');
const mongoose = require('mongoose');
const app = require('./app'); // Adjust path if needed
require('dotenv').config();

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err);
    throw err;
  }
};

// Wrap the Express app for serverless
const handler = async (req, res) => {
  await connectDB();
  return serverless(app)(req, res);
};

module.exports = handler;
