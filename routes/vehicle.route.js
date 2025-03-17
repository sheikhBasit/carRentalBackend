const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');

router.post('/postVehicle', upload.fields([{ name: "carImage", maxCount: 1 }]), vehicleController.createVehicle);
router.get('/getVehicle', vehicleController.getAllVehicles);
router.get("/getManufacturers", vehicleController.getManufacturers);
router.get("/company", vehicleController.getCompanyVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.put('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.get('/',vehicleController.getVehicles);
module.exports = router;
