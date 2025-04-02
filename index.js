require('dotenv').config(); // Load environment variables first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rentalCompanyRoutes = require('./routes/rentalCompany.route.js');
const vehicleRoutes = require('./routes/vehicle.route.js');
const userRoutes = require('./routes/user.route.js');
const bookingRoutes= require('./routes/booking.route.js');
const driverRoutes = require('./routes/driver.route.js');
const authRoute = require('./routes/auth.route.js');
const { router } = require('./utils/firebaseConfig.js');
const commentRoutes = require('./routes/commentRoutes.js');
const likeRoutes = require('./routes/likeRoutes.js');
const stripeRoute = require('./routes/payment.route.js');


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/users', userRoutes);
app.use('/bookings', bookingRoutes);
app.use('/drivers', driverRoutes);
app.use('/rental-companies', rentalCompanyRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/auth',authRoute);
app.use('/messaging', router);
app.use('/comment', commentRoutes);
app.use('/likes', likeRoutes);
app.use('/stripe', stripeRoute);

const port = process.env.PORT || 5000;
const dbURL = process.env.MONGO_DB_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// Sample Route to Check Server Status
app.get('/', (req, res) => {
  res.send('Server is running!');
  console.log("server");
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

module.exports = mongoose;
