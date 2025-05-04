const express = require('express');
const router = express.Router();
const damageReportController = require('../controllers/damagereport.controller');

// Get all damage reports
router.get('/', damageReportController.getDamageReports);

// Create a new damage report
router.post('/', damageReportController.createDamageReport);

// Update a damage report (e.g., mark as resolved)
router.patch('/:id', damageReportController.updateDamageReport);

module.exports = router;
