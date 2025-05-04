const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json'); 
const express = require('express');
const router = express.Router();
// console.log("Service Account:", serviceAccount);
const RentalCompany = require('../models/rentalcompany.model.js');
const User = require('../models/user.model.js');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),

});

const messaging = admin.messaging();

router.post("/send-fcm-notification", async (req, res) => {
    const { companyId, title, message } = req.body;
  
    try {
      // Retrieve company FCM token from the database
      const company = await RentalCompany.findById(companyId);
      if (!company || !company.fcmToken) {
        return res.status(400).json({ error: "Company FCM Token not found." });
      }
  
      const payload = {
        notification: {
          title,
          body: message,
        },
        token: company.fcmToken,
      };
  
      await admin.messaging().send(payload);
      res.json({ success: true, message: "Notification sent successfully." });
    } catch (error) {
      console.error("FCM Error:", error);
      res.status(500).json({ error: "Failed to send notification." });
    }
  });

  router.post("/send-user-fcm-notification", async (req, res) => {
    const { userId, title, message } = req.body;
  
    try {
      // Retrieve company FCM token from the database
      const user = await User.findById(userId);
      if (!user || !user.fcmToken) {
        return res.status(400).json({ error: "User FCM Token not found." });
      }
  
      const payload = {
        notification: {
          title,
          body: message,
        },
        token: user.fcmToken, // Fix: changed company.fcmToken to user.fcmToken
      };
  
      await admin.messaging().send(payload);
      res.json({ success: true, message: "Notification sent successfully." });
    } catch (error) {
      console.error("FCM Error:", error);
      res.status(500).json({ error: "Failed to send notification." });
    }
  });
  
// Utility function to send FCM notification to a user
async function sendUserPushNotification(userId, title, message) {
  const user = await User.findById(userId);
  if (!user || !user.fcmToken) return;
  const payload = {
    notification: { title, body: message },
    token: user.fcmToken,
  };
  try {
    await admin.messaging().send(payload);
    console.log('Push notification sent to user:', user.email || userId);
  } catch (err) {
    console.error('Error sending push notification to user:', err);
  }
}
// Utility function to send FCM notification to a company
async function sendCompanyPushNotification(companyId, title, message) {
  const company = await RentalCompany.findById(companyId);
  if (!company || !company.fcmToken) return;
  const payload = {
    notification: { title, body: message },
    token: company.fcmToken,
  };
  try {
    await admin.messaging().send(payload);
    console.log('Push notification sent to company:', company.email || companyId);
  } catch (err) {
    console.error('Error sending push notification to company:', err);
  }
}

module.exports = { admin, messaging, sendUserPushNotification, sendCompanyPushNotification, router };
