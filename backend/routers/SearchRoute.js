const express = require('express');
const router = express.Router();
const { searchFacilities } = require('../controllers/FacilitiesController.js');

// Match the route
router.get('/facilities', searchFacilities);

module.exports = router;