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
        token: company.fcmToken,
      };
  
      await admin.messaging().send(payload);
      res.json({ success: true, message: "Notification sent successfully." });
    } catch (error) {
      console.error("FCM Error:", error);
      res.status(500).json({ error: "Failed to send notification." });
    }
  });
  
//   module.exports = router;
  
  

module.exports = {
    messaging: messaging,
    router: router,
}

