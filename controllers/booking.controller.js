const Booking = require('../models/booking.model.js'); // Ensure the correct path
const mongoose = require('mongoose');
const User = require('../models/user.model.js'); // Ensure the correct path

const createBooking = async (req, res) => {
  try {
    console.log("Received data:", req.body); // Debugging log

    // Extract user ID and other booking data from the request body
    const { user, ...bookingData } = req.body;

    // Check if the user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Create a new booking with the user reference
    const booking = new Booking({
      ...bookingData,
      user: user, // Reference to the user
    });

    // Save the booking to the database
    await booking.save();

    // Populate the user field in the booking document
    const populatedBooking = await Booking.findById(booking._id).populate("user", "name email");

    console.log("Booking saved:", populatedBooking); // Debugging log
    return res.status(201).json({ message: "Booking created successfully", booking: populatedBooking });
  } catch (error) {
    console.error("Error creating booking:", error); // Log error
    return res.status(400).json({ error: error.message });
  }
};

const getAllBookings = async (req, res) => {
  console.log("get all bookings");
  
  try {
    console.log("get all bookings");
    const bookings = await Booking.find().populate('idVehicle'); // Populate vehicle details
    console.log("Retrieved Bookings:", bookings);

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error); // Log error for debugging
    res.status(500).json({ error: error.message });
  }
};

const getBookingByUserId = async (req, res) => {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const bookings = await Booking.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId
          ...(status && { status }), // Only filter by status if provided
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "idVehicle",
          foreignField: "_id",
          as: "idVehicle",
          pipeline: [
            {
              $project: {
                manufacturer: 1,
                model: 1,
                carImageUrl: 1,
                transmission: 1,
                rent: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "rentalcompanies",
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [
            {
              $project: {
                companyName: 1,
                gmail: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$idVehicle",
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true, 
        },
      },
    ]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found for the user" });
    }

    return res.status(200).json(bookings);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const getBookingByCompanyId = async (req, res) => {
  try {
    const { company, status } = req.query;
    console.log(company,status);
    
    if (!mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    const bookings = await Booking.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(company), // Ensure it's an ObjectId
          ...(status && { status }),
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "idVehicle",
          foreignField: "_id",
          as: "idVehicle",
          pipeline: [
            {
              $project: {
                manufacturer: 1,
                model: 1,
                carImageUrl: 1,
                transmission: 1,
                rent: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$idVehicle",
          preserveNullAndEmptyArrays: true, // Keep booking even if no vehicle is found
        },
      },
    ]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings for the company" });
    }
    console.log(bookings)
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({ error: error.message });
  }
};



// Get a single booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('idVehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return  res.status(200).json(booking);
  } catch (error) {
    return  res.status(500).json({ error: error.message });
  }
};

// Update a booking
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('idVehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return  res.status(200).json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Delete a booking
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return  res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {createBooking,getBookingByCompanyId , getAllBookings,getBookingByUserId , getBookingById , updateBooking , deleteBooking};

