const Booking = require('../models/booking.model.js'); // Ensure the correct path
const mongoose = require('mongoose');
const User = require('../models/user.model.js'); // Ensure the correct path
const Vehicle = require('../models/vehicle.model.js'); // Ensure the correct path
const Driver = require('../models/driver.model.js'); // Ensure the correct path

const createBooking = async (req, res) => {
  try {
    console.log("Received booking request with data:", req.body);

    const { user, idVehicle, from, to, fromTime, toTime, intercity, cityName, driver, ...bookingData } = req.body;

    // Validate required fields
    if (!user) {
      console.log("No user ID provided in request");
      return res.status(400).json({ 
        success: false,
        error: "User ID is required" 
      });
    }

    if (!idVehicle) {
      console.log("No vehicle ID provided in request");
      return res.status(400).json({ 
        success: false,
        error: "Vehicle ID is required" 
      });
    }

    if (!from || !to || !fromTime || !toTime) {
      return res.status(400).json({ 
        success: false,
        error: "From location, to location, from time, and to time are required" 
      });
    }

    // Validate dates and times
    const fromDateTime = new Date(`${from}T${fromTime}`);
    const toDateTime = new Date(`${to}T${toTime}`);
    const currentDateTime = new Date();

    if (fromDateTime < currentDateTime) {
      return res.status(400).json({ 
        success: false,
        error: "Start time cannot be in the past" 
      });
    }

    if (toDateTime <= fromDateTime) {
      return res.status(400).json({ 
        success: false,
        error: "End time must be after start time" 
      });
    }

    // Validate intercity booking
    if (intercity && !cityName) {
      return res.status(400).json({ 
        success: false,
        error: "City name is required for intercity bookings" 
      });
    }

    // Check if user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      console.log(`User not found with ID: ${user}`);
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    // Check if vehicle exists
    const vehicle = await Vehicle.findById(idVehicle);
    if (!vehicle) {
      console.log(`Vehicle not found with ID: ${idVehicle}`);
      return res.status(404).json({ 
        success: false,
        error: "Vehicle not found" 
      });
    }

    // Check vehicle blackout dates
    if (vehicle.blackoutDates && vehicle.blackoutDates.length > 0) {
      const bookingDates = [];
      let currentDate = new Date(fromDateTime);
      const endDate = new Date(toDateTime);
      
      while (currentDate <= endDate) {
        bookingDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const blackoutDates = vehicle.blackoutDates.map(date => 
        new Date(date).toISOString().split('T')[0]
      );

      const hasBlackoutDate = bookingDates.some(date => blackoutDates.includes(date));
      if (hasBlackoutDate) {
        return res.status(400).json({ 
          success: false,
          error: "Vehicle is not available for the selected dates" 
        });
      }
    }

    // If driver is provided, check driver availability and blackout dates
    let driverDoc = null;
    if (driver) {
      driverDoc = await Driver.findById(driver);
      if (!driverDoc) {
        return res.status(404).json({ 
          success: false,
          error: "Driver not found" 
        });
      }

      // Check driver blackout dates
      if (driverDoc.blackoutDates && driverDoc.blackoutDates.length > 0) {
        const bookingDates = [];
        let currentDate = new Date(fromDateTime);
        const endDate = new Date(toDateTime);
        
        while (currentDate <= endDate) {
          bookingDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const blackoutDates = driverDoc.blackoutDates.map(date => 
          new Date(date).toISOString().split('T')[0]
        );

        const hasBlackoutDate = bookingDates.some(date => blackoutDates.includes(date));
        if (hasBlackoutDate) {
          return res.status(400).json({ 
            success: false,
            error: "Driver is not available for the selected dates" 
          });
        }
      }

      // Check for driver's overlapping bookings
      const driverOverlappingBookings = await Booking.find({
        driver,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          {
            fromTime: { $lt: toTime },
            toTime: { $gt: fromTime }
          }
        ]
      });

      if (driverOverlappingBookings.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: "Driver is already booked for the selected time period" 
        });
      }
    }

    // Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      idVehicle,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        {
          fromTime: { $lt: toTime },
          toTime: { $gt: fromTime }
        }
      ]
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: "Vehicle is already booked for the selected time period" 
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the booking
      const booking = new Booking({
        ...bookingData,
        user,
        idVehicle,
        driver,
        from,
        to,
        fromTime,
        toTime,
        intercity,
        cityName: intercity ? cityName.toLowerCase() : undefined,
        status: 'pending'
      });

      // Save the booking
      await booking.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate booking details for response
      const populatedBooking = await Booking.findById(booking._id)
        .populate("user", "name email")
        .populate("idVehicle", "manufacturer model")
        .populate("driver", "name license");

      return res.status(201).json({ 
        success: true,
        message: "Booking created successfully", 
        booking: populatedBooking 
      });

    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find and validate the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }

    // Validate booking is in pending state
    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: `Booking is already ${booking.status}` 
      });
    }

    // Find and validate the vehicle
    const vehicle = await Vehicle.findById(booking.idVehicle);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        error: "Vehicle not found" 
      });
    }

    // Start transaction to ensure both updates succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update booking status to confirmed
      booking.status = 'confirmed';
      await booking.save({ session });

      // Add booking dates to vehicle's blackout dates
      const bookingDates = [];
      let currentDate = new Date(booking.from);
      const endDate = new Date(booking.to);
      
      while (currentDate <= endDate) {
        bookingDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update vehicle's blackout dates
      await Vehicle.findByIdAndUpdate(
        booking.idVehicle,
        { 
          $addToSet: { blackoutDates: { $each: bookingDates } },
          $inc: { trips: 1 }
        },
        { session }
      );

      // If driver is assigned, update driver's blackout dates
      if (booking.driver) {
        await Driver.findByIdAndUpdate(
          booking.driver,
          { 
            $addToSet: { blackoutDates: { $each: bookingDates } }
          },
          { session }
        );
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ 
        success: true,
        message: "Booking confirmed successfully",
        booking
      });

    } catch (transactionError) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error("Error confirming booking:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message || "Failed to confirm booking" 
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find and validate the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }

    // Validate booking is not already cancelled/completed
    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        error: "Booking is already cancelled" 
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ 
        success: false,
        error: "Cannot cancel a completed booking" 
      });
    }

    // Find and validate the vehicle
    const vehicle = await Vehicle.findById(booking.idVehicle);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        error: "Vehicle not found" 
      });
    }

    // Start transaction to ensure atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate all dates between booking.from and booking.to
      const bookingDates = [];
      const startDate = new Date(booking.from);
      const endDate = new Date(booking.to);
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        bookingDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update booking status to cancelled
      booking.status = 'cancelled';
      await booking.save({ session });

      // Remove booking dates from vehicle's blackout dates
      if (vehicle.blackoutDates && vehicle.blackoutDates.length > 0) {
        vehicle.blackoutDates = vehicle.blackoutDates.filter(date => {
          const dateStr = new Date(date).toISOString().split('T')[0];
          return !bookingDates.some(bookingDate => 
            bookingDate.toISOString().split('T')[0] === dateStr
          );
        });
        await vehicle.save({ session });
      }

      // If there's a driver assigned, remove booking dates from driver's blackout dates
      if (booking.driver) {
        const driver = await Driver.findById(booking.driver);
        if (driver && driver.blackoutDates && driver.blackoutDates.length > 0) {
          driver.blackoutDates = driver.blackoutDates.filter(date => {
            const dateStr = new Date(date).toISOString().split('T')[0];
            return !bookingDates.some(bookingDate => 
              bookingDate.toISOString().split('T')[0] === dateStr
            );
          });
          await driver.save({ session });
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ 
        success: true,
        message: "Booking cancelled successfully",
        booking
      });

    } catch (transactionError) {
      // Rollback if any operation fails
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message || "Failed to cancel booking" 
    });
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
                carImageUrls: 1,
                transmission: 1,
                rent: 1,
                capacity: 1,
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
                carImageUrls: 1,
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

module.exports = {createBooking,getBookingByCompanyId,cancelBooking ,confirmBooking, getAllBookings,getBookingByUserId , getBookingById , updateBooking , deleteBooking};

