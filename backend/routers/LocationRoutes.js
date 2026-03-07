const express = require("express");
const router = express.Router();
const locationController = require("../controllers/FacilitiesController");

// Geocoding
router.post("/geocode", locationController.geocodeLocation);
router.post("/reverse", locationController.reverseGeocodeLocation);

// Nearby facilities
router.get("/nearby", locationController.getNearbyFacilities);
router.post("/search-by-address", locationController.searchFacilitiesByAddress);

// Routing
router.get("/route", locationController.getRouteInfo);

// External Place of Interest
router.get("/external-places", locationController.searchNearbyPlacesEndpoint);

// Autocomplete
router.get("/autocomplete", locationController.getAddressAutocomplete);

module.exports = router;