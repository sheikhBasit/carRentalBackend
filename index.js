require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB connection (serverless-safe)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Health check
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Routes
app.use('/users', require('./routes/user.route.js'));
app.use('/bookings', require('./routes/booking.route.js'));
app.use('/drivers', require('./routes/driver.route.js'));
app.use('/rental-companies', require('./routes/rentalCompany.route.js'));
app.use('/vehicles', require('./routes/vehicle.route.js'));
app.use('/auth', require('./routes/auth.route.js'));
app.use('/comment', require('./routes/commentRoutes.js'));
app.use('/likes', require('./routes/likeRoutes.js'));
app.use('/stripe', require('./routes/payment.route.js'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Wrap Express for Vercel
const handler = serverless(app);

module.exports = async (req, res) => {
  try {
    await connectDB();
    return handler(req, res);
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
