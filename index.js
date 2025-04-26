require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// ====================== ENHANCED CORS CONFIGURATION ======================
const DEV_ORIGINS = [
  'http://localhost:5173',          // Vite dev server
  'http://localhost:3000',          // Create-React-App
  'capacitor://localhost',          // Capacitor mobile
  'http://10.0.2.2',                // Android emulator
  'exp://192.168.x.x:19000',        // Expo dev
  /\.ngrok\.io$/,                   // ngrok tunnels
];

const PROD_ORIGINS = [
  'https://your-production-web.com',
  'https://your-mobile-app.com',
  'ionic://your.app.package'        // Your mobile app bundle ID
];

const CORS_OPTIONS = {
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // 2. Check against whitelist
    const allowedOrigins = [
      ...(process.env.NODE_ENV === 'production' ? PROD_ORIGINS : DEV_ORIGINS),
      ...(process.env.EXTRA_ORIGINS?.split(',') || []) // Optional env override
    ];

    const isAllowed = allowedOrigins.some(allowed => 
      typeof allowed === 'string' 
        ? allowed === origin 
        : allowed.test?.(origin)
    );

    isAllowed 
      ? callback(null, true)
      : callback(new Error(`Origin '${origin}' not allowed. Register at ${process.env.API_DOCS_URL || 'your-contact-page'}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24h
};

app.use(cors(CORS_OPTIONS));
app.options('*', cors(CORS_OPTIONS)); // Enable preflight for all routes
// ========================================================================

// Middleware
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