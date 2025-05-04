// Analytics API Routes
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/bookings', analyticsController.getBookingAnalytics);
router.get('/vehicle-utilization', analyticsController.getVehicleUtilization);
router.get('/stats', analyticsController.getStats);

module.exports = router;
