const express = require("express");
const {
    createAdminSettings,
    getAdminSettings,
    updateAdminSettings,
    deleteAdminSettings
} = require("../controllers/AdminSettingsController.js");

const router = express.Router();

// Create admin settings (POST)
router.post("/", createAdminSettings);

// Get admin settings (GET)
router.get("/", getAdminSettings);

// Update admin settings by ID (PUT)
router.put("/:id", updateAdminSettings);

// Delete admin settings by ID (DELETE)
router.delete("/:id", deleteAdminSettings);

module.exports = router;
