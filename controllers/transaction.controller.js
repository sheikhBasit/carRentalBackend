// controllers/transactionBookingController.js

const TransactionBooking = require('../models/transaction.model.js');
const Booking = require('../models/booking.model.js');
const mongoose = require('mongoose');

// Create a new TransactionBooking
exports.createTransactionBooking = async (req, res) => {
  try {
    const { transactionId, bookingId, amount, paymentStatus, paymentMethod } = req.body;

    const newTransactionBooking = new TransactionBooking({
      transactionId,
      bookingId,
      amount,
      paymentStatus,
      paymentMethod,
    });

    const savedTransactionBooking = await newTransactionBooking.save();

    return res.status(201).json(savedTransactionBooking);
  } catch (error) {
    console.error("Error creating TransactionBooking:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all TransactionBookings
exports.getAllTransactionBookings = async (req, res) => {
  try {
    const transactionBookings = await TransactionBooking.find().populate('bookingId');
    return res.status(200).json(transactionBookings);
  } catch (error) {
    console.error("Error fetching TransactionBookings:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all TransactionBookings for a specific company
exports.getTransactionsByCompany = async (req, res) => {
    try {
      const { companyId } = req.params;
  
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
  
      // Step 1: Find all bookings that belong to this company
      const bookings = await Booking.find({ company: companyId }).select('_id'); // Make sure field name is 'company'
  
      const bookingIds = bookings.map(booking => booking._id);
  
      // Step 2: Find all transactions where bookingId is in the list
      const transactions = await TransactionBooking.find({
        bookingId: { $in: bookingIds }
      }).populate('bookingId');
  
      return res.status(200).json(transactions);
    } catch (error) {
      console.error("Error fetching transactions by company:", error);
      return res.status(500).json({ error: error.message });
    }
  };
   
// Get a single TransactionBooking by ID
exports.getTransactionBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const transactionBooking = await TransactionBooking.findById(id).populate('bookingId');

    if (!transactionBooking) {
      return res.status(404).json({ message: "TransactionBooking not found" });
    }

    return res.status(200).json(transactionBooking);
  } catch (error) {
    console.error("Error fetching TransactionBooking:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update TransactionBooking (e.g., update paymentStatus)
exports.updateTransactionBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedTransactionBooking = await TransactionBooking.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedTransactionBooking) {
      return res.status(404).json({ message: "TransactionBooking not found" });
    }

    return res.status(200).json(updatedTransactionBooking);
  } catch (error) {
    console.error("Error updating TransactionBooking:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete a TransactionBooking
exports.deleteTransactionBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransactionBooking = await TransactionBooking.findByIdAndDelete(id);

    if (!deletedTransactionBooking) {
      return res.status(404).json({ message: "TransactionBooking not found" });
    }

    return res.status(200).json({ message: "TransactionBooking deleted successfully" });
  } catch (error) {
    console.error("Error deleting TransactionBooking:", error);
    return res.status(500).json({ error: error.message });
  }
};
