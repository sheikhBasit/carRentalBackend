const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('./models/booking.model');
const User = require('./models/user.model');
const RentalCompany = require('./models/rentalcompany.model');
const { sendUserPushNotification, sendCompanyPushNotification } = require('./utils/firebaseConfig');
const { sendBookingConfirmationEmail } = require('./mailtrap/email');

// Helper to get time difference in minutes
function minutesDiff(date1, date2) {
  return Math.floor((date2.getTime() - date1.getTime()) / (60 * 1000));
}

let scheduledTasks = [];

// Function to start all scheduled tasks
function startScheduledTasks() {
  console.log('Starting scheduled notification tasks...');

  // Runs every 5 minutes
  const reminderTask = cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled notification tasks at:', new Date().toISOString());

    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      // --- Delivery Reminders ---
      const deliveryBookings = await Booking.find({
        status: 'confirmed',
        fromTime: { $gte: now, $lte: in30min },
        deliveryReminderSent: { $ne: true }
      }).populate('user', 'email name fcmToken')
        .populate('idVehicle', 'model numberPlate manufacturer companyId company')
        .populate('idDriver', 'fcmToken');

      console.log(`Processing ${deliveryBookings.length} delivery reminders`);
      
      for (const booking of deliveryBookings) {
        try {
          const vehicle = booking.idVehicle;
          const company = vehicle?.companyId || vehicle?.company;
          const companyDoc = company ? await RentalCompany.findById(company) : null;

          // Send push notifications
          if (booking.user?.fcmToken) {
            await sendUserPushNotification(
              booking.user._id,
              'Upcoming Vehicle Delivery',
              `Your ${vehicle?.manufacturer} ${vehicle?.model} will be delivered soon.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Upcoming Vehicle Delivery',
              `Vehicle delivery for booking ${booking._id} is scheduled soon.`
            );
          }

          if (booking.idDriver?.fcmToken) {
            await sendUserPushNotification(
              booking.idDriver._id,
              'Delivery Assignment',
              `You have a vehicle delivery scheduled for booking ${booking._id}.`
            );
          }

          // Send emails
          if (booking.user?.email) {
            await sendBookingConfirmationEmail(
              booking.user.email,
              booking.user.name,
              {
                _id: booking._id,
                vehicleName: `${vehicle?.manufacturer} ${vehicle?.model}`,
                from: booking.fromTime.toLocaleString(),
                to: booking.toTime.toLocaleString()
              },
              false,
              'Upcoming Vehicle Delivery',
              `Your vehicle will be delivered at ${booking.fromTime.toLocaleString()}.`
            );
          }

          if (companyDoc?.email) {
            await sendBookingConfirmationEmail(
              companyDoc.email,
              companyDoc.companyName,
              {
                _id: booking._id,
                vehicleName: `${vehicle?.manufacturer} ${vehicle?.model}`,
                from: booking.fromTime.toLocaleString(),
                to: booking.toTime.toLocaleString(),
                customerName: booking.user?.name
              },
              true,
              'Upcoming Vehicle Delivery',
              `Vehicle delivery for booking ${booking._id} is scheduled.`
            );
          }

          booking.deliveryReminderSent = true;
          await booking.save();
        } catch (err) {
          console.error(`Error processing delivery reminder for booking ${booking._id}:`, err);
        }
      }

      // --- Return Reminders ---
      const returnBookings = await Booking.find({
        status: 'ongoing',
        toTime: { $gte: now, $lte: in30min },
        returnReminderSent: { $ne: true }
      }).populate('user', 'email name fcmToken')
        .populate('idVehicle', 'model numberPlate manufacturer')
        .populate('idDriver', 'fcmToken');

      console.log(`Processing ${returnBookings.length} return reminders`);
      
      for (const booking of returnBookings) {
        try {
          const vehicle = booking.idVehicle;
          const company = vehicle?.companyId || vehicle?.company;
          const companyDoc = company ? await RentalCompany.findById(company) : null;

          // Send push notifications
          if (booking.user?.fcmToken) {
            await sendUserPushNotification(
              booking.user._id,
              'Upcoming Vehicle Return',
              `Please return your ${vehicle?.manufacturer} ${vehicle?.model} by ${booking.toTime.toLocaleTimeString()}.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Upcoming Vehicle Return',
              `Vehicle return for booking ${booking._id} is due soon.`
            );
          }

          if (booking.idDriver?.fcmToken) {
            await sendUserPushNotification(
              booking.idDriver._id,
              'Return Assignment',
              `You have a vehicle return scheduled for booking ${booking._id}.`
            );
          }

          // Send emails
          if (booking.user?.email) {
            await sendBookingConfirmationEmail(
              booking.user.email,
              booking.user.name,
              {
                _id: booking._id,
                vehicleName: `${vehicle?.manufacturer} ${vehicle?.model}`,
                from: booking.fromTime.toLocaleString(),
                to: booking.toTime.toLocaleString()
              },
              false,
              'Upcoming Vehicle Return',
              `Please return your vehicle by ${booking.toTime.toLocaleString()}.`
            );
          }

          if (companyDoc?.email) {
            await sendBookingConfirmationEmail(
              companyDoc.email,
              companyDoc.companyName,
              {
                _id: booking._id,
                vehicleName: `${vehicle?.manufacturer} ${vehicle?.model}`,
                from: booking.fromTime.toLocaleString(),
                to: booking.toTime.toLocaleString(),
                customerName: booking.user?.name
              },
              true,
              'Upcoming Vehicle Return',
              `Vehicle return for booking ${booking._id} is due soon.`
            );
          }

          booking.returnReminderSent = true;
          await booking.save();
        } catch (err) {
          console.error(`Error processing return reminder for booking ${booking._id}:`, err);
        }
      }

      // --- Overdue Bookings ---
      const overdueBookings = await Booking.find({
        status: 'ongoing',
        toTime: { $lt: now },
        overdueNotified: { $ne: true }
      }).populate('user', 'fcmToken')
        .populate('idVehicle', 'model numberPlate manufacturer')
        .populate('idDriver', 'fcmToken');

      console.log(`Processing ${overdueBookings.length} overdue notifications`);
      
      for (const booking of overdueBookings) {
        try {
          const vehicle = booking.idVehicle;
          const company = vehicle?.companyId || vehicle?.company;
          const companyDoc = company ? await RentalCompany.findById(company) : null;

          // Send push notifications
          if (booking.user?.fcmToken) {
            await sendUserPushNotification(
              booking.user._id,
              'Vehicle Return Overdue',
              `Your ${vehicle?.manufacturer} ${vehicle?.model} is overdue for return.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Vehicle Return Overdue',
              `Vehicle for booking ${booking._id} is overdue.`
            );
          }

          if (booking.idDriver?.fcmToken) {
            await sendUserPushNotification(
              booking.idDriver._id,
              'Overdue Return',
              `The vehicle for booking ${booking._id} is overdue for return.`
            );
          }

          booking.overdueNotified = true;
          await booking.save();
        } catch (err) {
          console.error(`Error processing overdue notification for booking ${booking._id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error in scheduled notification task:', error);
    }
  }, {
    scheduled: false,
    timezone: "Asia/Karachi"
  });

  scheduledTasks.push(reminderTask);
  reminderTask.start();

  return scheduledTasks;
}

// Function to stop all scheduled tasks
function stopScheduledTasks() {
  console.log('Stopping all scheduled tasks...');
  scheduledTasks.forEach(task => task.stop());
  scheduledTasks = [];
}

module.exports = {
  startScheduledTasks,
  stopScheduledTasks
};