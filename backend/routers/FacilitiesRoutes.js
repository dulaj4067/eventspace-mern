const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/facility.controller");

router.post("/", facilityController.createFacility);
router.post("/bulk", facilityController.createFacilitiesBulk);

router.get("/", facilityController.getAllFacilities);
router.get("/:id", facilityController.getFacilityById);

router.put("/:id", facilityController.updateFacility);
router.put("/bulk/update", facilityController.updateFacilitiesBulk);

router.delete("/:id", facilityController.deleteFacility);
router.delete("/bulk/delete", facilityController.deleteFacilitiesBulk);

module.exports = router;
