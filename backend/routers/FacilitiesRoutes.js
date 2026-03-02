const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/FacilitiesController");

const { verifyToken, isAdmin } = require("../middleware/Authmiddleware");

// Public routes
router.get("/search", facilityController.searchFacilities);
router.get("/", facilityController.getAllFacilities);
router.get("/:id", facilityController.getFacilityById);

// Admin-only bulk routes
router.post("/bulk", verifyToken, isAdmin, facilityController.createFacilitiesBulk);
router.put("/bulk/update", verifyToken, isAdmin, facilityController.updateFacilitiesBulk);
router.delete("/bulk/delete", verifyToken, isAdmin, facilityController.deleteFacilitiesBulk);


router.post("/", verifyToken,  facilityController.createFacility);
router.put("/:id", verifyToken, facilityController.updateFacility);
router.delete("/:id", verifyToken, facilityController.deleteFacility);

module.exports = router;