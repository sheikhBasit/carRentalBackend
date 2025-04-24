require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

// Database connection
mongoose.connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });