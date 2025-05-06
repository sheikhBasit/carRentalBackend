const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');

// --- Vehicle Management Best Practices Extensions ---
const {
  setVehicleStatus,
  logMaintenance,
  updatePricing,
  softDeleteVehicle,
  uploadVehicleImages,
  searchVehicles
} = require('../controllers/vehicle.controller.js');

router.delete('/', vehicleController.deleteAllVehicles);

router.post('/postVehicle', upload.array("carImageUrls", 3), vehicleController.createVehicle);
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

// Set vehicle status
router.patch('/:id/status', setVehicleStatus);
// Log maintenance
router.post('/:id/maintenance', logMaintenance);
// Update dynamic pricing/discount
router.patch('/:id/pricing', updatePricing);
// Soft delete/restore
router.patch('/:id/soft-delete', softDeleteVehicle);
// Upload images
router.post('/:id/images', upload.array('images', 10), uploadVehicleImages);
// Search/filter vehicles
router.get('/search', searchVehicles);

module.exports = router;
