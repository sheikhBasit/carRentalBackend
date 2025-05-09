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

let scheduledTasks = [];

// Function to remove booking period from blackout periods
async function removeFromBlackoutPeriods(booking) {
  try {
    const Vehicle = mongoose.model('Vehicle');
    const Driver = mongoose.model('Driver');
    
    // Update vehicle's blackout periods
    const vehicle = await Vehicle.findById(booking.idVehicle);
    if (vehicle && vehicle.blackoutPeriods && vehicle.blackoutPeriods.length > 0) {
      vehicle.blackoutPeriods = vehicle.blackoutPeriods.filter(period => {
        return !(period.start.getTime() === booking.fromTime.getTime() && 
                period.end.getTime() === booking.toTime.getTime());
      });
      await vehicle.save();
    }
    
    // Update driver's blackout periods if booking has a driver
    if (booking.idDriver) {
      const driver = await Driver.findById(booking.idDriver);
      if (driver && driver.blackoutPeriods && driver.blackoutPeriods.length > 0) {
        driver.blackoutPeriods = driver.blackoutPeriods.filter(period => {
          return !(period.start.getTime() === booking.fromTime.getTime() && 
                  period.end.getTime() === booking.toTime.getTime());
        });
        await driver.save();
      }
    }
    
    console.log(`Removed booking period from blackout periods for booking ${booking._id}`);
  } catch (err) {
    console.error(`Error removing blackout periods for booking ${booking._id}:`, err);
  }
}

// Function to start all scheduled tasks
function startScheduledTasks() {
  console.log('Starting scheduled notification tasks...');
  
  // Runs every 5 minutes
  const reminderTask = cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled notification tasks at:', new Date().toISOString());
    
    // Initialize 'now' only once
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));  // Start of today at 00:00:00
    const endOfToday = new Date(now.setHours(23, 59, 59, 999)); // End of today at 23:59:59

    try {
      // --- Delivery Reminders ---
      const deliveryBookings = await Booking.find({
        status: { $in: ['confirmed'] },
        fromTime: { $gte: now, $lte: in30min },
        deliveryReminderSent: { $ne: true }
      });

      console.log(`Processing ${deliveryBookings.length} delivery reminders`);
      
      for (const booking of deliveryBookings) {
        try {
          const userDoc = await User.findById(booking.user);
          const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
          const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;

          if (userDoc?.fcmToken) {
            await sendUserPushNotification(
              userDoc._id,
              'Upcoming Vehicle Delivery',
              `Your vehicle for booking ${booking._id} will be delivered at ${booking.fromTime}.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Upcoming Vehicle Delivery',
              `A vehicle delivery for booking ${booking._id} is scheduled at ${booking.fromTime}.`
            );
          }

          booking.deliveryReminderSent = true;
          await booking.save();
        } catch (err) {
          console.error(`Error sending delivery reminder for booking ${booking._id}:`, err);
        }
      }

      // --- Return Reminders ---
      const returnBookings = await Booking.find({
        status: { $in: ['ongoing'] },
        toTime: { $gte: now, $lte: in30min },
        returnReminderSent: { $ne: true }
      });

      console.log(`Processing ${returnBookings.length} return reminders`);
      
      for (const booking of returnBookings) {
        try {
          const userDoc = await User.findById(booking.user);
          const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
          const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;

          if (userDoc?.fcmToken) {
            await sendUserPushNotification(
              userDoc._id,
              'Upcoming Vehicle Return',
              `Your booking ${booking._id} is due for return at ${booking.toTime}. Please return the vehicle on time.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Upcoming Vehicle Return',
              `Vehicle for booking ${booking._id} is due for return at ${booking.toTime}.`
            );
          }

          booking.returnReminderSent = true;
          await booking.save();
        } catch (err) {
          console.error(`Error sending return reminder for booking ${booking._id}:`, err);
        }
      }

      // --- Overdue Return Notifications ---
      const overdueBookings = await Booking.find({
        status: { $in: ['ongoing'] },
        toTime: { $lt: now },
        overdueNotified: { $ne: true }
      });

      console.log(`Processing ${overdueBookings.length} overdue notifications`);
      
      for (const booking of overdueBookings) {
        try {
          const userDoc = await User.findById(booking.user);
          const vehicleDoc = await mongoose.model('Vehicle').findById(booking.idVehicle);
          const companyDoc = vehicleDoc ? await RentalCompany.findById(vehicleDoc.companyId || vehicleDoc.company) : null;

          if (userDoc?.fcmToken) {
            await sendUserPushNotification(
              userDoc._id,
              'Vehicle Return Overdue',
              `Your booking ${booking._id} is overdue for return. Please return the vehicle as soon as possible.`
            );
          }

          if (companyDoc?.fcmToken) {
            await sendCompanyPushNotification(
              companyDoc._id,
              'Vehicle Return Overdue',
              `Vehicle for booking ${booking._id} is overdue for return.`
            );
          }

          booking.overdueNotified = true;
          await booking.save();
        } catch (err) {
          console.error(`Error sending overdue notification for booking ${booking._id}:`, err);
        }
      }

      // --- Auto-complete Past Bookings ---
      const pastBookings = await Booking.find({
        status: { $in: ['confirmed', 'ongoing'] },
        fromTime: { $lt: startOfToday }, // Ensure `fromTime` is strictly before today
        toTime: { $lt: startOfToday }    // Ensure `toTime` is strictly before today
      });
      
      console.log(`Auto-completing ${pastBookings.length} past bookings`);
      
      for (const booking of pastBookings) {
        try {
          // Only mark as completed if both fromTime and toTime are strictly in the past (before today)
          booking.status = 'completed';
          await booking.save();
          
          // Remove the booking period from blackout periods
          await removeFromBlackoutPeriods(booking);
          
          console.log(`Booking ${booking._id} marked as completed and removed from blackout periods.`);
        } catch (err) {
          console.error(`Error updating booking ${booking._id} status to completed:`, err);
        }
      }
      
    } catch (error) {
      console.error('Error in scheduled notification task:', error);
    }
  }, {
    scheduled: false // Don't start immediately
  });

  // Store the task for potential stopping later
  scheduledTasks.push(reminderTask);
  
  // Start the task
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