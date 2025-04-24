const serverless = require('serverless-http');
const app = require('./app');
const mongoose = require('mongoose');
require('dotenv').config();

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
const handler = async (event, context) => {
  await connectDB();
  const serverlessHandler = serverless(app);
  return await serverlessHandler(event, context);
};

module.exports.handler = handler;