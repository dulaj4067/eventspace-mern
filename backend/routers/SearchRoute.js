const express = require('express');
const { algoliaSearch } = require('../controllers/SearchController.js');

const router = express.Router();

router.get('/', algoliaSearch);

module.exports = router;