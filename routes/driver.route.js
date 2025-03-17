const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');

router.post('/postDriver', upload.fields([{ name: "profileimg", maxCount: 1 }]),  driverController.createDriver);
router.get('/company', driverController.getCompanyDrivers);

router.get('/getDriver', driverController.getAllDrivers);
router.get('/:id', driverController.getDriverById);
router.put('/:id', driverController.updateDriver);
router.delete('/:id', driverController.deleteDriver);

module.exports = router;
