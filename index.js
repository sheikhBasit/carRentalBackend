require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection setup
const dbURL = process.env.MONGO_DB_URL;

if (!dbURL) {
  console.error('❌ MongoDB connection URL is missing');
  process.exit(1);
}

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    isConnected = db.connections[0].readyState;
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

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

// Route usage
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
app.get('/api/health', async (req, res) => {
  await connectDB(); // ensure DB is connected
  res.status(200).json({ 
    status: 'healthy',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 500 error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Local dev server only (Vercel auto-handles production)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('❌ Failed to start local server:', err);
  });
}

// Export for Vercel serverless usage
module.exports = app;
