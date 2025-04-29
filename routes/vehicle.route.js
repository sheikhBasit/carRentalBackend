const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');


router.delete('/', vehicleController.deleteAllVehicles);

router.post('/postVehicle', upload.array("carImages", 3), vehicleController.createVehicle);
router.get('/getVehicle', vehicleController.getAllVehicles);
router.get('/getCityVehicle', vehicleController.getAllCityVehicles);
router.get('/fetchVehicles',vehicleController.fetchAllVehicles);
router.get("/getManufacturers", vehicleController.getManufacturers);
router.get("/company", vehicleController.getCompanyVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.put('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.get('/',vehicleController.getVehicles);
router.post("/getLikedVehicles", vehicleController.getLikedVehicles);
router.get('/manufacturer/:manufacturer', vehicleController.getVehiclesByManufacturer);
module.exports = router;
