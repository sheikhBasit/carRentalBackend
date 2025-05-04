const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('./models/booking.model');
const User = require('./models/user.model');
const RentalCompany = require('./models/rentalcompany.model');
const { sendUserPushNotification, sendCompanyPushNotification } = require('./utils/firebaseConfig');

// Helper to get time difference in minutes
function minutesDiff(date1, date2) {
  return Math.floor((date2.getTime() - date1.getTime()) / (60 * 1000));
}

// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);

  // Find bookings for delivery reminder (pending/confirmed, delivery in next 30min)
  const deliveryBookings = await Booking.find({
    status: { $in: ['confirmed'] },
    fromTime: { $gte: now, $lte: in30min },
    deliveryReminderSent: { $ne: true }
  });

  for (const booking of deliveryBookings) {
    // Notify user and company
    try {
      const userDoc = await User.findById(booking.user);
      const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
      const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;
      // User notification
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Upcoming Vehicle Delivery',
          `Your vehicle for booking ${booking._id} will be delivered at ${booking.fromTime}.`
        );
      }
      // Company notification
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Upcoming Vehicle Delivery',
          `A vehicle delivery for booking ${booking._id} is scheduled at ${booking.fromTime}.`
        );
      }
      booking.deliveryReminderSent = true;
      await booking.save();
    } catch (err) {
      console.error('Error sending delivery reminder notification:', err);
    }
  }

  // Find bookings for return reminder (ongoing, return in next 30min)
  const returnBookings = await Booking.find({
    status: { $in: ['ongoing'] },
    toTime: { $gte: now, $lte: in30min },
    returnReminderSent: { $ne: true }
  });

  for (const booking of returnBookings) {
    try {
      const userDoc = await User.findById(booking.user);
      const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
      const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;
      // User notification
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Upcoming Vehicle Return',
          `Your booking ${booking._id} is due for return at ${booking.toTime}. Please return the vehicle on time.`
        );
      }
      // Company notification
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Upcoming Vehicle Return',
          `Vehicle for booking ${booking._id} is due for return at ${booking.toTime}.`
        );
      }
      booking.returnReminderSent = true;
      await booking.save();
    } catch (err) {
      console.error('Error sending return reminder notification:', err);
    }
  }

  // Optional: Overdue return notifications
  const overdueBookings = await Booking.find({
    status: { $in: ['ongoing'] },
    toTime: { $lt: now },
    overdueNotified: { $ne: true }
  });

  for (const booking of overdueBookings) {
    try {
      const userDoc = await User.findById(booking.user);
      const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
      const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;
      // User notification
      if (userDoc && userDoc.fcmToken) {
        await sendUserPushNotification(
          userDoc._id,
          'Vehicle Return Overdue',
          `Your booking ${booking._id} is overdue for return. Please return the vehicle as soon as possible.`
        );
      }
      // Company notification
      if (companyDoc && companyDoc.fcmToken) {
        await sendCompanyPushNotification(
          companyDoc._id,
          'Vehicle Return Overdue',
          `Vehicle for booking ${booking._id} is overdue for return.`
        );
      }
      booking.overdueNotified = true;
      await booking.save();
    } catch (err) {
      console.error('Error sending overdue notification:', err);
    }
  }

  // You can add more logic for email reminders if needed
});

module.exports = {};
