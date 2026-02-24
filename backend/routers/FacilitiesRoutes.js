const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/FacilitiesController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// Public routes
router.get("/", facilityController.getAllFacilities);
router.get("/:id", facilityController.getFacilityById);

// Admin-only bulk routes
router.post("/bulk",protect,authorize("admin"),facilityController.createFacilitiesBulk);

router.put("/bulk/update",protect,authorize("admin"),facilityController.updateFacilitiesBulk);

router.delete("/bulk/delete",protect,authorize("admin"),facilityController.deleteFacilitiesBulk);


router.post("/", protect, authorize("admin"), facilityController.createFacility);
router.put("/:id", protect, authorize("admin"), facilityController.updateFacility);
router.delete("/:id", protect, authorize("admin"), facilityController.deleteFacility);

module.exports = router;