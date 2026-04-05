const express = require('express');
const {
  createFacility,
  getAllFacilities,
  getFacilityById,
  getMyFacilities,
  updateFacility,
  deleteFacility,
  verifyFacility,
  getFacilityReport
} = require('../controllers/FacilitiesController.js');
const { verifyToken, optionalVerifyToken, isAdmin } = require("../middleware/Authmiddleware.js");
const router = express.Router();

// PUBLIC ROUTES (optional auth so admins can list all; public sees verified only)
router.get('/', optionalVerifyToken, getAllFacilities);
router.get('/:id', optionalVerifyToken, getFacilityById);

// OWNER ROUTES
router.get('/owner/my-facilities', verifyToken, getMyFacilities);
router.get('/:id/report', verifyToken, getFacilityReport);

// AUTHENTICATED USER ROUTES
router.post("/", verifyToken, createFacility);
router.put("/:id", verifyToken, updateFacility);
router.delete("/:id", verifyToken, deleteFacility);

// ADMIN ROUTES 
router.put('/:id/verify', verifyToken, isAdmin, verifyFacility);

module.exports = router;