const Booking = require('../models/booking.model.js'); // Ensure the correct path
const mongoose = require('mongoose');
const User = require('../models/user.model.js'); // Ensure the correct path
const Vehicle = require('../models/vehicle.model.js'); // Ensure the correct path
const Driver = require('../models/driver.model.js'); // Ensure the correct path
const RentalCompany = require('../models/rentalcompany.model');
const {sendBookingConfirmationEmail} = require('../mailtrap/email');
const { sendUserPushNotification, sendCompanyPushNotification } = require('../utils/firebaseConfig');

// --- ENFORCE BUFFER TIME, PAYMENT, CANCELLATION, AUDIT LOGIC ---

const checkBufferTime = async (vehicleId, fromTime, toTime) => {
  const vehicle = await Vehicle.findById(vehicleId);
  const bufferMinutes = vehicle?.bufferMinutes || 120;
  const bufferMs = bufferMinutes * 60 * 1000;

  const newStart = new Date(fromTime);
  const newEnd = new Date(toTime);

  const existingBookings = await Booking.find({
    idVehicle: vehicleId,
    status: { $in: ['pending', 'confirmed', 'ongoing'] }
  });

  for (const booking of existingBookings) {
    const existingStart = new Date(booking.fromTime);
    const existingEnd = new Date(booking.toTime);
    const bufferEnd = new Date(existingEnd.getTime() + bufferMs);

    const conflict = (
      (newStart >= existingStart && newStart < bufferEnd) ||
      (newEnd > existingStart && newEnd <= bufferEnd) ||
      (newStart <= existingStart && newEnd >= bufferEnd)
    );

    if (conflict) {
      const alreadyExists = vehicle.blackoutPeriods.some(period => {
        return (
          new Date(period.from).getTime() === existingEnd.getTime() &&
          new Date(period.to).getTime() === bufferEnd.getTime()
        );
      });

      if (!alreadyExists) {
        vehicle.blackoutPeriods.push({
          from: existingEnd,
          to: bufferEnd,
          reason: 'buffer',
          relatedBooking: booking._id
        });
        await vehicle.save();
        console.log(`📅 Blackout period added: ${existingEnd} - ${bufferEnd}`);
      }

      return {
        allowed: false,
        message: `BUFFER CONFLICT: Booking starts within ${bufferMinutes} min buffer after another booking.`
      };
    }
  }

  return { allowed: true, message: 'No buffer conflict.' };
};


const isDateRangeAvailable = (blackoutPeriods, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return !blackoutPeriods.some(period => {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);
    return (start <= periodEnd && end >= periodStart);
  });
};

// --- Atomic Booking Creation with Buffer, Payment, Promo, Price, Audit, Channel ---
const createBooking = async (req, res) => {
  try {
    console.log('[createBooking] Request received:', req.body);

    const { user, idVehicle, from, to, fromTime, toTime, intercity, cityName, driver, termsAccepted, paymentStatus, promoCode, bookingChannel, ...bookingData } = req.body;

    if (!user || !idVehicle || !from || !to || !fromTime || !toTime) {
      console.warn('[createBooking] Missing required fields');
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    console.log('[createBooking] Validating user:', user);
    const userDoc = await User.findById(user);
    if (!userDoc || userDoc.isBlocked) {
      console.warn('[createBooking] User not found or blocked:', user);
      return res.status(403).json({ success: false, error: "User not found or blocked" });
    }

    console.log('[createBooking] Validating vehicle:', idVehicle);
    const vehicleDoc = await Vehicle.findById(idVehicle);
    if (!vehicleDoc || vehicleDoc.isDeleted) {
      console.warn('[createBooking] Vehicle not found or deleted:', idVehicle);
      return res.status(404).json({ success: false, error: "Vehicle not found" });
    }

    // Blackout check
    if (vehicleDoc.blackoutPeriods?.length > 0) {
      const isAvailable = isDateRangeAvailable(vehicleDoc.blackoutPeriods, from, to);
      console.log('[createBooking] Blackout check result:', isAvailable);
      if (!isAvailable) {
        return res.status(409).json({ 
          success: false, 
          error: "Vehicle is not available for the selected dates (blackout period)" 
        });
      }
    }

    // Buffer time check
    console.log('[createBooking] Checking buffer time');
    const bufferResult = await checkBufferTime(idVehicle, fromTime, toTime);
    console.log('[createBooking] Buffer check result:', bufferResult);
    if (!bufferResult.allowed) {
      return res.status(409).json({
        success: false,
        error: bufferResult.message,
      });
    }

    // Payment & terms validation
    if (!['pending', 'paid'].includes(paymentStatus)) {
      console.warn('[createBooking] Invalid payment status:', paymentStatus);
      return res.status(400).json({ success: false, error: "Invalid payment status" });
    }
    if (!termsAccepted) {
      console.warn('[createBooking] Terms not accepted');
      return res.status(400).json({ success: false, error: "Terms and conditions must be accepted" });
    }

    // Pricing calculations
    let base = vehicleDoc.dynamicPricing?.baseRate || 0;
    let discount = 0;
    let tax = 0;
    let total = base;

    console.log('[createBooking] Base rate:', base);

    if (vehicleDoc.discount?.percent && vehicleDoc.discount.validUntil > new Date()) {
      const discountAmount = (base * vehicleDoc.discount.percent) / 100;
      discount += discountAmount;
      total -= discountAmount;
      console.log('[createBooking] Applied vehicle discount:', discountAmount);
    }

    if (promoCode === 'PAKISTAN10') {
      const promoDiscount = base * 0.10;
      discount += promoDiscount;
      total -= promoDiscount;
      console.log('[createBooking] Applied promo discount:', promoDiscount);
    }

    tax = total * 0.16;
    total += tax;

    console.log('[createBooking] Final price:', { base, discount, tax, total });

    const booking = new Booking({
      user,
      idVehicle,
      company: vehicleDoc.company,
      driver: driver || null,
      from,
      to,
      fromTime,
      toTime,
      intercity,
      cityName,
      status: 'pending',
      bufferMinutes: vehicleDoc.bufferMinutes || 120,
      paymentStatus,
      cancellationPolicy: vehicleDoc.cancellationPolicy || 'moderate',
      termsAccepted,
      promoCode,
      bookingChannel: bookingChannel || 'web',
      priceDetails: { base, discount, tax, total },
      auditLogs: [{ action: 'created', by: user, details: 'Booking created', at: new Date() }],
      ...bookingData
    });

    console.log('[createBooking] Saving booking');
    await booking.save();

    console.log('[createBooking] Marking vehicle as booked');
    vehicleDoc.status = 'booked';
    await vehicleDoc.save();

    console.log('[createBooking] Booking success:', booking._id);
    res.status(201).json({ success: true, booking });

  } catch (err) {
    console.error('[createBooking] Exception caught:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ success: false, error: err.message });
  }
};


// --- Cancel Booking with Refund, Reason, Audit ---
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, reason } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status === 'canceled') return res.status(400).json({ success: false, error: 'Already canceled' });
    // Refund logic: flexible (full), moderate (50%), strict (none)
    let refund = 0;
    if (booking.cancellationPolicy === 'flexible') refund = booking.priceDetails?.total || 0;
    else if (booking.cancellationPolicy === 'moderate') refund = (booking.priceDetails?.total || 0) * 0.5;
    // strict: no refund
    booking.status = 'canceled';
    booking.refundAmount = refund;
    booking.cancellationReason = reason || '';
    booking.auditLogs.push({ action: 'canceled', by: user, details: reason, at: new Date() });
    await booking.save();
    // Mark vehicle as available
    const vehicleDoc = await Vehicle.findById(booking.idVehicle);
  if (vehicleDoc && vehicleDoc.blackoutPeriods && Array.isArray(vehicleDoc.blackoutPeriods)) {
  const bookingStart = new Date(booking.from);
  const bookingEnd = new Date(booking.to);

  vehicleDoc.blackoutPeriods = vehicleDoc.blackoutPeriods.filter(period => {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);
    // Keep periods that don't match this booking
    return !(periodStart.getTime() === bookingStart.getTime() && periodEnd.getTime() === bookingEnd.getTime());
  });

  await vehicleDoc.save();
}

    // --- NOTIFICATION LOGIC ---
    try {
      const userDoc = await User.findById(booking.user);
      const companyDoc = await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company);
      if (userDoc && userDoc.email) {
        await sendBookingConfirmationEmail(
          userDoc.email,
          userDoc.name,
          {
            _id: booking._id,
            vehicleName: vehicleDoc.model || vehicleDoc.manufacturer || '',
            from: booking.from,
            to: booking.to
          },
          false
        );
      }
      if (companyDoc && companyDoc.email) {
        await sendBookingConfirmationEmail(
          companyDoc.email,
          companyDoc.companyName,
          {
            _id: booking._id,
            vehicleName: vehicleDoc.model || vehicleDoc.manufacturer || '',
            from: booking.from,
            to: booking.to
          },
          true
        );
      }
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Booking canceled',
          `Your booking for ${vehicleDoc.model || vehicleDoc.manufacturer || 'vehicle'} from ${booking.from} to ${booking.to} has been canceled.`
        );
      }
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Booking canceled',
          `A booking for ${vehicleDoc.model || vehicleDoc.manufacturer || 'vehicle'} from ${booking.from} to ${booking.to} has been canceled.`
        );
      }
    } catch (notifyErr) {
      console.error('Error sending booking cancellation emails or push notifications:', notifyErr);
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- Complete Booking: Handover/Return, Feedback/Damage Link, Audit ---
const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, feedbackId, damageReportIds } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    booking.status = 'completed';
    booking.handoverAt = booking.handoverAt || new Date();
    booking.returnedAt = new Date();
    if (feedbackId) booking.feedback.push(feedbackId);
    if (damageReportIds && damageReportIds.length > 0) booking.damageReports.push(...damageReportIds);
    booking.auditLogs.push({ action: 'completed', by: user, details: 'Booking completed', at: new Date() });
    await booking.save();
    // Mark vehicle as available
    const vehicleDoc = await Vehicle.findById(booking.idVehicle);
    if (vehicleDoc) {
      vehicleDoc.status = 'available';
      await vehicleDoc.save();
    }
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- Soft Delete/Restore Booking (admin/company) ---
const softDeleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { isDeleted } = req.body;
    const booking = await Booking.findByIdAndUpdate(id, { isDeleted }, { new: true });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    booking.auditLogs.push({ action: isDeleted ? 'archived' : 'restored', at: new Date() });
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- Add Admin/Company Note ---
const addAdminNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, user } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    booking.adminNotes = note;
    booking.auditLogs.push({ action: 'note', by: user, details: note, at: new Date() });
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(req.params)
    console.log("bookingID",bookingId)
    // Find and validate the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }
    console.log("booking",booking)

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
      const blackoutPeriod = {
        from: booking.from,
        to: booking.to
      };
      
      // Update vehicle's blackout periods
      await Vehicle.findByIdAndUpdate(
        booking.idVehicle,
        {
          $push: { blackoutPeriods: blackoutPeriod },
          $inc: { trips: 1 }
        },
        { session }
      );
      
      // If driver is assigned, update driver's blackout periods
      if (booking.driver) {
        await Driver.findByIdAndUpdate(
          booking.driver,
          {
            $push: { blackoutPeriods: blackoutPeriod }
          },
          { session }
        );
      }
      
      // --- NOTIFICATION LOGIC ---
      // Notify user and company by email
      try {
        // Get user and company info
        const userDoc = await User.findById(booking.user);
        const companyDoc = await RentalCompany.findById(vehicle.companyId || vehicle.company);
        // Send to user
        if (userDoc && userDoc.email) {
          await sendBookingConfirmationEmail(
            userDoc.email,
            userDoc.name,
            {
              _id: booking._id,
              vehicleName: vehicle.model || vehicle.manufacturer || '',
              from: booking.from,
              to: booking.to
            },
            false
          );
        }
        // Send to company
        if (companyDoc && companyDoc.email) {
          await sendBookingConfirmationEmail(
            companyDoc.email,
            companyDoc.companyName,
            {
              _id: booking._id,
              vehicleName: vehicle.model || vehicle.manufacturer || '',
              from: booking.from,
              to: booking.to
            },
            true
          );
        }
        // --- PUSH NOTIFICATIONS ---
        if (userDoc && userDoc.fcmToken) {
          await sendUserPushNotification(
            userDoc._id,
            'Booking Confirmed',
            `Your booking for ${vehicle.model || vehicle.manufacturer || 'vehicle'} from ${booking.from} to ${booking.to} has been confirmed.`
          );
        }
        if (companyDoc && companyDoc.fcmToken) {
          await sendCompanyPushNotification(
            companyDoc._id,
            'New Booking Confirmed',
            `A booking for ${vehicle.model || vehicle.manufacturer || 'vehicle'} from ${booking.from} to ${booking.to} has been confirmed.`
          );
        }
      } catch (notifyErr) {
        console.error('Error sending booking confirmation emails or push notifications:', notifyErr);
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

const getAllBookings = async (req, res) => {
  console.log("get all bookings");

  try {
    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: 'users', // collection name in lowercase plural
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'idVehicle',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $sort: { createdAt: -1 } // Optional: sort by latest
      }
    ]);

    console.log("Retrieved Bookings:", bookings);
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message });
  }
};

const getBookingByUserId = async (req, res) => {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    // Update bookings that should be marked as ongoing
    await Booking.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        status: 'confirmed',
        from: { $lte: today }, // from date is in past or today
        to: { $gte: today }    // to date is in future or today
      },
      { $set: { status: 'ongoing' } }
    );

    // Update bookings that should be marked as completed
    await Booking.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        status: { $in: ['confirmed', 'ongoing'] }, // Check both statuses
        to: { $lt: today } // to date is in the past
      },
      { $set: { status: 'completed' } }
    );

    const bookings = await Booking.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
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
    console.log(company, status);

    if (!mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    const bookings = await Booking.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(company),
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 }, // Optional: sort by latest
      }
    ]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings for the company" });
    }

    console.log(bookings);
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const bookingId = new mongoose.Types.ObjectId(req.params.id);

    const result = await Booking.aggregate([
      { $match: { _id: bookingId } },

      // Populate Vehicle
      {
        $lookup: {
          from: 'vehicles',
          localField: 'idVehicle',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },

      // Populate User
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Populate Driver (if applicable)
      {
        $lookup: {
          from: 'drivers',
          localField: 'driver',
          foreignField: '_id',
          as: 'driver'
        }
      },
      { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('idVehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return  res.status(200).json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Only allow deletion if booking is not active
    if (['pending', 'confirmed', 'ongoing'].includes(booking.status)) {
      return res.status(400).json({
        message: 'Cannot delete active booking',
        bookingStatus: booking.status
      });
    }
    await Booking.findByIdAndDelete(req.params.id);
    return  res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- Mark Vehicle as Delivered ---
const deliverVehicle = async (req, res) => {
  try {
    const { id } = req.params; // booking ID
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status !== 'confirmed') return res.status(400).json({ success: false, error: 'Booking not confirmed' });
    booking.status = 'ongoing';
    booking.deliveredAt = new Date();
    booking.auditLogs.push({ action: 'delivered', by: req.user?._id || 'system', details: 'Vehicle delivered to user', at: new Date() });
    await booking.save();
    // Optionally update vehicle status
    const vehicle = await Vehicle.findById(booking.idVehicle);
    if (vehicle) {
      vehicle.status = 'ongoing';
      await vehicle.save();
    }
    // Notify user and company
    try {
      const userDoc = await User.findById(booking.user);
      const companyDoc = await RentalCompany.findById(vehicle.companyId || vehicle.company);
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Vehicle Delivered',
          `Your vehicle for booking ${booking._id} has been delivered. Enjoy your ride!`
        );
      }
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Vehicle Delivered',
          `Vehicle for booking ${booking._id} has been delivered to the customer.`
        );
      }
    } catch (notifyErr) {
      console.error('Error sending delivery push notifications:', notifyErr);
    }
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// --- Mark Vehicle as Returned ---
const returnVehicle = async (req, res) => {
  try {
    const { id } = req.params; // booking ID
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status !== 'ongoing') return res.status(400).json({ success: false, error: 'Vehicle not currently in use' });
    booking.status = 'completed';
    booking.returnedAt = new Date();
    booking.auditLogs.push({ action: 'returned', by: req.user?._id || 'system', details: 'Vehicle returned by user', at: new Date() });
    await booking.save();
    // Mark vehicle as available
    const vehicle = await Vehicle.findById(booking.idVehicle);
    if (vehicle) {
      vehicle.status = 'available';
      await vehicle.save();
    }
    // Notify user and company
    try {
      const userDoc = await User.findById(booking.user);
      const companyDoc = await RentalCompany.findById(vehicle.companyId || vehicle.company);
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Vehicle Returned',
          `Your ride for booking ${booking._id} has been successfully returned. Thank you!`
        );
      }
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Vehicle Returned',
          `Vehicle for booking ${booking._id} has been returned by the customer.`
        );
      }
    } catch (notifyErr) {
      console.error('Error sending return push notifications:', notifyErr);
    }
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createBooking,
  completeBooking,
  getBookingByCompanyId,
  cancelBooking,
  confirmBooking,
  deliverVehicle,
  returnVehicle,
  getAllBookings,
  getBookingByUserId,
  getBookingById,
  updateBooking,
  deleteBooking,
  softDeleteBooking,
  addAdminNote
};
