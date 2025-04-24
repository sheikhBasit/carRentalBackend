require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// CORS config
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/users', require('../routes/user.route'));
app.use('/bookings', require('../routes/booking.route'));
app.use('/drivers', require('../routes/driver.route'));
app.use('/rental-companies', require('../routes/rentalCompany.route'));
app.use('/vehicles', require('../routes/vehicle.route'));
app.use('/auth', require('../routes/auth.route'));
app.use('/comment', require('../routes/commentRoutes'));
app.use('/likes', require('../routes/likeRoutes'));
app.use('/stripe', require('../routes/payment.route'));

// Health check
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
