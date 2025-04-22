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

app.use('/users', userRoutes);
app.use('/bookings', bookingRoutes);
app.use('/drivers', driverRoutes);
app.use('/rental-companies', rentalCompanyRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/auth', authRoute);
app.use('/comment', commentRoutes);
app.use('/likes', likeRoutes);
app.use('/stripe', stripeRoute);

// Health check route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Database connection
const dbURL = process.env.MONGO_DB_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
    
    // After connection, remove problematic index
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// async function removeProblematicIndex() {
//   try {
//     const collection = mongoose.connection.db.collection('vehicles');
//     const indexes = await collection.indexes();
    
//     // Find and drop the problematic index
//     const problematicIndex = indexes.find(index => 
//       index.key?.carImageUrl === 1 || index.key?.carImageUrls === 1
//     );
    
//     if (problematicIndex) {
//       await collection.dropIndex(problematicIndex.name);
//       console.log('✅ Successfully dropped problematic index:', problematicIndex.name);
//     } else {
//       console.log('ℹ️ No problematic index found');
//     }
//   } catch (error) {
//     console.log('⚠️ Index removal error (may already be dropped):', error.message);
//   }
// }

// Export the Vercel handler
module.exports = async (req, res) => {
  // Ensure database is connected
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
  
  // Pass the request to Express
  app(req, res);
};


// Handle shutdown gracefully
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('⏏️ MongoDB connection closed due to app termination');
  process.exit(0);
});