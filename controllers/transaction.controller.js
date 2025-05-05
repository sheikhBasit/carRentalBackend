// controllers/transactionBookingController.js

const TransactionBooking = require('../models/transaction.model.js');
const Booking = require('../models/booking.model.js');
const mongoose = require('mongoose');

// Get TransactionBooking by Booking ID
exports.getTransactionByBookingId = async (req, res) => {
    try {
      const { bookingId } = req.params;
  
      // Validate bookingId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID format" });
      }
  
      const transaction = await TransactionBooking.findOne({ bookingId })
        .populate('bookingId')
        .exec();
  
      if (!transaction) {
        return res.status(404).json({ 
          message: "Transaction not found for the given booking ID",
          success: false
        });
      }
  
      return res.status(200).json({
        transaction,
        success: true
      });
  
    } catch (error) {
      console.error("Error fetching transaction by booking ID:", error);
      return res.status(500).json({ 
        error: error.message,
        success: false 
      });
    }
  };

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

// Get all TransactionBookings with populated details
exports.getAllTransactionBookings = async (req, res) => {
  try {
    const transactionBookings = await TransactionBooking.aggregate([
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
          pipeline: [
            {
              $lookup: {
                from: "vehicles",
                localField: "idVehicle",
                foreignField: "_id",
                as: "vehicle",
                pipeline: [
                  {
                    $project: {
                      manufacturer: 1,
                      model: 1,
                      numberPlate: 1,
                      carImageUrls: 1,
                      transmission: 1,
                      capacity: 1,
                      rent: 1
                    }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      email: 1,
                      phoneNo: 1,
                      profilePic: 1
                    }
                  }
                ]
              }
            },
            {
              $unwind: {
                path: "$vehicle",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: "$booking",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          bookingId: 1,
          amount: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          createdAt: 1,
          updatedAt: 1,
          "booking.vehicle": 1,
          "booking.user": 1,
          "booking.from": 1,
          "booking.to": 1,
          "booking.fromTime": 1,
          "booking.toTime": 1,
          "booking.status": 1,
          "booking.intercity": 1,
          "booking.cityName": 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: transactionBookings
    });
  } catch (error) {
    console.error("Error fetching TransactionBookings:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
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

// Get detailed transaction information
exports.getTransactionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionBooking.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
          pipeline: [
            {
              $lookup: {
                from: "vehicles",
                localField: "idVehicle",
                foreignField: "_id",
                as: "vehicle",
                pipeline: [
                  {
                    $project: {
                      manufacturer: 1,
                      model: 1,
                      numberPlate: 1,
                      carImageUrls: 1,
                      transmission: 1,
                      capacity: 1,
                      rent: 1,
                      features: 1,
                      fuelType: 1,
                      year: 1,
                      companyId: 1
                    }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      email: 1,
                      phoneNo: 1,
                      profilePic: 1,
                      address: 1,
                      cnic: 1
                    }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: "drivers",
                localField: "driver",
                foreignField: "_id",
                as: "driver",
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      license: 1,
                      phNo: 1,
                      experience: 1,
                      profileimg: 1
                    }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: "rentalcompanies",
                localField: "vehicle.companyId",
                foreignField: "_id",
                as: "company",
                pipeline: [
                  {
                    $project: {
                      companyName: 1,
                      email: 1,
                      phoneNo: 1,
                      address: 1,
                      logo: 1,
                      rating: 1
                    }
                  }
                ]
              }
            },
            {
              $unwind: {
                path: "$vehicle",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: "$driver",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: "$company",
                preserveNullAndEmptyArrays: true
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: "$booking",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    if (!transaction || transaction.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction[0]
    });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
