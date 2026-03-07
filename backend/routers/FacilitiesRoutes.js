const express = require('express');
const {
  createFacility,
  getAllFacilities,
  getFacilityById,
  getMyFacilities,
  updateFacility,
  deleteFacility,
  verifyFacility
} = require('../controllers/FacilitiesController.js');

const { verifyToken, isAdmin } = require("../middleware/Authmiddleware.js");

const router = express.Router();

// PUBLIC ROUTES
router.get('/', getAllFacilities);

// OWNER ROUTES
router.get('/owner/my-facilities', verifyToken, getMyFacilities);

// ADMIN ROUTES 
router.put('/:id/verify', verifyToken, isAdmin, verifyFacility);

router.post("/", verifyToken,  facilityController.createFacility);
router.put("/:id", verifyToken, facilityController.updateFacility);
router.delete("/:id", verifyToken, facilityController.deleteFacility);
// DYNAMIC ROUTES
router.get('/:id', getFacilityById);
router.post('/', verifyToken, createFacility);
router.put('/:id', verifyToken, updateFacility);
router.delete('/:id', verifyToken, deleteFacility);

module.exports = router;