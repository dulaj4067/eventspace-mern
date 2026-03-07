const express = require("express");
const router = express.Router();
const controller = require("../controllers/CommunityCenterController");

// GET community centres within bounding box
router.get("/", controller.getCommunityCenters);

module.exports = router;