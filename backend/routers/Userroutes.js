const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getAllUsers, getUserById } = require("../controllers/Usercontroller");
const { verifyToken, isAdmin } = require("../middleware/Authmiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/", verifyToken, isAdmin, getAllUsers); // Admin only
router.get("/:id", verifyToken, getUserById);

module.exports = router;