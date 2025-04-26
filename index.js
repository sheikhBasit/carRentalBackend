require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware

// ====================== CORS CONFIGURATION ======================
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'capacitor://localhost',
  'http://10.0.2.2',
  'exp://192.168.x.x:19000',
  /\.ngrok\.io$/,
  'https://your-production-web.com',
  'https://your-mobile-app.com',
  'https://car-rental-frontend-black.vercel.app',  // <<==== ADD THIS
];

const CORS_OPTIONS = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      // Reflect the request origin in the CORS header
      return callback(null, origin);
    } else {
      console.warn(`Blocked request from origin: ${origin}`);
      return callback(new Error(`Origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
};

// Apply CORS middleware
app.use(cors(CORS_OPTIONS));

// Handle preflight requests
app.options('*', cors(CORS_OPTIONS));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
const rentalCompanyRoutes = require('./routes/rentalCompany.route.js');
const vehicleRoutes = require('./routes/vehicle.route.js');
const userRoutes = require('./routes/user.route.js');
const bookingRoutes = require('./routes/booking.route.js');
const driverRoutes = require('./routes/driver.route.js');
const authRoute = require('./routes/auth.route.js');
const commentRoutes = require('./routes/commentRoutes.js');
const likeRoutes = require('./routes/likeRoutes.js');
const stripeRoute = require('./routes/payment.route.js');

app.use('/users', userRoutes);
app.use('/bookings', bookingRoutes);
app.use('/drivers', driverRoutes);
app.use('/rental-companies', rentalCompanyRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/auth', authRoute);
app.use('/comment', commentRoutes);
app.use('/likes', likeRoutes);
app.use('/stripe', stripeRoute);

// Database connection
const dbURL = process.env.MONGO_DB_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(dbURL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Health check
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Enhanced error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS') || err.message.includes('Origin')) {
    return res.status(403).json({ 
      success: false, 
      error: err.message,
      docs: process.env.API_DOCS_URL || 'https://your-api-docs.com'
    });
  }

  // Handle other errors
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({ 
    success: false, 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;