const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');

// Create feedback (requires authentication)
router.post('/',  feedbackController.createFeedback);

// Get all feedback for a booking
router.get('/booking/:bookingId', feedbackController.getFeedbackForBooking);

// Get all feedback by a user
router.get('/user/:userId', feedbackController.getFeedbackByUser);

// Admin: get all feedback
router.get('/all', feedbackController.getAllFeedback);

module.exports = router;