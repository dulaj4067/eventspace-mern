const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    bulkUpdateUsers,
    bulkDeleteUsers,
    getCurrentUser
} = require("../controllers/Usercontroller");


// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Get all users
router.get("/", getAllUsers);

// Get current user (token-based)
const { verifyToken } = require("../middleware/Authmiddleware");
router.get("/me", verifyToken, getCurrentUser);

// Get user by ID
router.get("/:id", getUserById);

// Update user
router.put("/:id", updateUser);

// Delete user
router.delete("/:id", deleteUser);

// Bulk create users
router.post("/bulk/create", bulkCreateUsers);

// Bulk update users
router.put("/bulk/update", bulkUpdateUsers);

// Bulk delete users
router.delete("/bulk/delete", bulkDeleteUsers);


module.exports = router;
