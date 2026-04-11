const express = require("express");
const {
    registerAdmin,
    loginAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin
} = require("../controllers/AdminController.js");

const router = express.Router();

// Register admin
router.post("/register", registerAdmin);

// Login admin
router.post("/login", loginAdmin);

// Get all admins
router.get("/", getAllAdmins);

// Get admin by ID
router.get("/:id", getAdminById);

// Update admin
router.put("/:id", updateAdmin);

// Delete admin
router.delete("/:id", deleteAdmin);

module.exports = router;
