const serverless = require('serverless-http');
const app = require('./app.js');
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_DB_URL);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Middleware to connect DB before any request
const handler = async (req, res) => {
  await connectDB();
  const expressHandler = serverless(app);
  return expressHandler(req, res);
};

module.exports = handler;
