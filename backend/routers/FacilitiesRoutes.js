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
router.get('/:id', getFacilityById);

// OWNER ROUTES
router.get('/owner/my-facilities', verifyToken, getMyFacilities);

// AUTHENTICATED USER ROUTES
router.post("/", verifyToken, createFacility);
router.put("/:id", verifyToken, updateFacility);
router.delete("/:id", verifyToken, deleteFacility);

// ADMIN ROUTES 
router.put('/:id/verify', verifyToken, isAdmin, verifyFacility);

module.exports = router;