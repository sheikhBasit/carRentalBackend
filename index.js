require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ====================== CORS Configuration ======================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'capacitor://localhost',
  'http://10.0.2.2',
  'exp://192.168.x.x:19000',
  /\.ngrok\.io$/,
  'https://car-rental-frontend.vercel.app',
  'https://car-rental-backend-black.vercel.app'
];

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Enhanced CORS middleware - must come FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') return allowed === origin;
    if (allowed instanceof RegExp) return allowed.test(origin);
    return false;
  });

  if (isAllowed || !origin || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin'); // Important for caching
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Regular middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====================== Database Connection ======================
const dbURL = process.env.MONGO_DB_URL || 'mongodb://localhost:27017/car-rental';
const connectDB = async () => {
  try {
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// ====================== Routes ======================
const rentalCompanyRoutes = require('./routes/rentalCompany.route');
const vehicleRoutes = require('./routes/vehicle.route');
const userRoutes = require('./routes/user.route');
const bookingRoutes = require('./routes/booking.route');
const driverRoutes = require('./routes/driver.route');
const authRoute = require('./routes/auth.route');
const commentRoutes = require('./routes/commentRoutes');
const likeRoutes = require('./routes/likeRoutes');
const stripeRoute = require('./routes/payment.route');
const transactionBookingRoutes = require('./routes/transaction.route');
const damageReportRoutes = require('./routes/damagereport.route');
const analyticsRoutes = require('./routes/analytics.route');
const notificationRoutes = require('./routes/notification.route');
const feedbackRoutes = require('./routes/feedback.route');

app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rental-companies', rentalCompanyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auth', authRoute);
app.use('/api/comment', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/stripe', stripeRoute);
app.use('/api/transaction', transactionBookingRoutes);
app.use('/api/damagereport', damageReportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test CORS endpoint
app.get('/test-cors', (req, res) => {
  res.json({ 
    message: "CORS test successful", 
    headers: req.headers,
    allowedOrigins
  });
});

// ====================== Error Handling ======================
// Not found handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Always set CORS headers on errors
  const origin = req.headers.origin;
  if (allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle different error types
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload error',
      code: err.code
    });
  }

  // Handle CORS errors specifically
  if (err.message.includes('CORS') || err.message.includes('Origin')) {
    return res.status(403).json({ 
      success: false, 
      error: 'Not allowed by CORS',
      allowedOrigins,
      requestOrigin: origin
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors
    });
  }

  console.error('Server Error:', err);
  
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      type: err.name 
    })
  });
});

// ====================== Server Setup ======================
const PORT = process.env.PORT || 5000;
require('./scheduledNotifications');
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received. Shutting down gracefully');
//   server.close(() => {
//     console.log('Server closed');
//     mongoose.connection.close(false, () => {
//       console.log('MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received. Shutting down gracefully');
//   server.close(() => {
//     console.log('Server closed');
//     mongoose.connection.close(false, () => {
//       console.log('MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// });

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
});


module.exports = app;