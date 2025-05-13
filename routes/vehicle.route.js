const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller.js');
const upload = require('../midllewares/fileUpload.middleware.js');

// --- CORS Preflight Handling for All Routes ---
router.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// --- Vehicle CRUD Endpoints ---

// Bulk delete (admin only)
router.delete('/', vehicleController.deleteAllVehicles);

// Vehicle creation with image upload
router.post('/postVehicle', 
  upload.array("carImageUrls", 3), 
  vehicleController.createVehicle
);

// Vehicle retrieval endpoints
router.get('/getVehicle', vehicleController.getAllVehicles);
router.get('/getCityVehicle', vehicleController.getAllCityVehicles);
router.get('/fetchVehicles', vehicleController.fetchAllVehicles);
router.get("/getManufacturers", vehicleController.getManufacturers);
router.get("/company", vehicleController.getCompanyVehicles);
router.get('/', vehicleController.getVehicles);

// Individual vehicle operations
router.route('/:id')
  .get(vehicleController.getVehicleById)
  .put(vehicleController.updateVehicle)
  .delete(vehicleController.deleteVehicle);

// Specialized endpoints
router.post("/getLikedVehicles", vehicleController.getLikedVehicles);
router.get('/manufacturer/:manufacturer', vehicleController.getVehiclesByManufacturer);

// --- Vehicle Management Extensions ---

// Set vehicle status (available/unavailable/maintenance)
router.patch('/:id/status', vehicleController.setVehicleStatus);

// Log maintenance history
router.post('/:id/maintenance', vehicleController.logMaintenance);

// Update dynamic pricing
router.patch('/:id/pricing', vehicleController.updatePricing);

// Soft delete/restore
router.patch('/:id/soft-delete', vehicleController.softDeleteVehicle);

// Upload additional images
router.post('/:id/images', 
  upload.array('images', 10), 
  vehicleController.uploadVehicleImages
);

// Search/filter vehicles with query parameters
router.get('/search', vehicleController.searchVehicles);

module.exports = router;