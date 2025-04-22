require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Use routes with proper prefixes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rental-companies', rentalCompanyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auth', authRoute);
app.use('/api/comment', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/stripe', stripeRoute);

// Health check
app.get('/', (req, res) => {
  res.send('🚀 Server is running!');
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Database connection
const dbURL = process.env.MONGO_DB_URL;

const connectDB = async () => {
  if (!dbURL) {
    console.error('❌ MongoDB connection URL is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Start the server locally only (Vercel handles listen automatically)
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  if (process.env.VERCEL_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  }
};

// Start if not running on Vercel (exporting for Vercel)
if (require.main === module) {
  startServer();
}

module.exports = app;
