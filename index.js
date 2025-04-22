require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// Enhanced Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

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

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rental-companies', rentalCompanyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auth', authRoute);
app.use('/api/comment', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/stripe', stripeRoute);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

app.get('/api/health/db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({
      database: 'connected',
      status: 'healthy'
    });
  } catch (err) {
    res.status(500).json({
      database: 'disconnected',
      status: 'unhealthy',
      error: err.message
    });
  }
});

// Database connection
const dbURL = process.env.MONGO_DB_URL;

if (!dbURL) {
  console.error('❌ MongoDB connection URL is not defined in environment variables');
  process.exit(1);
}

const connectDB = async () => {
  try {
    console.log('⏳ Attempting to connect to MongoDB...');
    
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected Successfully');
    
    // Optional: Remove problematic index
    try {
      await removeProblematicIndex();
    } catch (indexError) {
      console.warn('⚠️ Index removal warning:', indexError.message);
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

async function removeProblematicIndex() {
  try {
    const collection = mongoose.connection.db.collection('vehicles');
    const indexes = await collection.indexes();
    
    const problematicIndex = indexes.find(index => 
      index.key?.carImageUrl === 1 || index.key?.carImageUrls === 1
    );
    
    if (problematicIndex) {
      await collection.dropIndex(problematicIndex.name);
      console.log('✅ Successfully dropped problematic index:', problematicIndex.name);
    }
  } catch (error) {
    console.log('⚠️ Index removal error:', error.message);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date()
  });
});

// Server setup
let server;
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 3000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check at http://localhost:${PORT}/api/health`);
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('🚪 HTTP server closed');
    }
    
    await mongoose.connection.close();
    console.log('⏏️ MongoDB connection closed');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

// Handle signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
startServer().catch(err => {
  console.error('🔥 Unhandled startup error:', err);
  process.exit(1);
});

module.exports = app;