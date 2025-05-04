// Analytics Controller: Aggregates data for dashboard analytics
const Transaction = require('../models/transaction.model');
const Booking = require('../models/booking.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const RentalCompany = require('../models/rentalCompany.model');

exports.getRevenueAnalytics = async (req, res) => {
  try {
    // Example: revenue per month for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenue = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'completed' } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        total: { $sum: '$amount' }
      } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ revenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBookingAnalytics = async (req, res) => {
  try {
    // Example: bookings per month for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const bookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 }
      } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVehicleUtilization = async (req, res) => {
  try {
    // Example: count vehicles by status
    const inUse = await Vehicle.countDocuments({ status: 'in_use' });
    const available = await Vehicle.countDocuments({ status: 'available' });
    const maintenance = await Vehicle.countDocuments({ status: 'maintenance' });
    res.json({ inUse, available, maintenance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const companies = await RentalCompany.countDocuments();
    const vehicles = await Vehicle.countDocuments();
    const bookings = await Booking.countDocuments();
    const transactions = await Transaction.countDocuments();
    res.json({ users, companies, vehicles, bookings, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
