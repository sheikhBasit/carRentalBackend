// Notification Controller
const Notification = require('../models/notification.model');

exports.getNotifications = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type && type !== 'all' ? { type } : {};
    const notifications = await Notification.find(filter).sort({ timestamp: -1 }).limit(100);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send and log notification with retry
exports.sendNotification = async ({ type, recipient, message }) => {
  let attempts = 0;
  let status = 'pending';
  let error = '';
  let notificationDoc;
  while (attempts < 2 && status !== 'sent') {
    attempts++;
    try {
      // Simulate sending notification (replace with real logic)
      // e.g., await sendPush(), sendEmail(), etc.
      // Assume success for now
      status = 'sent';
      error = '';
    } catch (err) {
      status = 'failed';
      error = err.message;
    }
    notificationDoc = await Notification.create({
      type, recipient, message, status, error, attempts, timestamp: new Date()
    });
    if (status === 'sent') break;
  }
  return notificationDoc;
};
