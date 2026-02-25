const express = require("express");
const router = express.Router();
const {
    createPayment,
    getAllPayments,
    getPaymentById,
    getPaymentsByUserId,
    updatePaymentStatus,
    processPayment,
    getPaymentLogs,
    deletePayment
} = require("../controllers/PaymentController");
const { verifyToken, isAdmin } = require("../middleware/Authmiddleware");

// Public/User routes
router.post("/", verifyToken, createPayment);
router.get("/user/:userId", verifyToken, getPaymentsByUserId);
router.get("/:id", verifyToken, getPaymentById);
router.post("/:id/process", verifyToken, processPayment);
router.get("/:id/logs", verifyToken, getPaymentLogs);

// Admin routes
router.get("/", verifyToken, isAdmin, getAllPayments);
router.put("/:id/status", verifyToken, isAdmin, updatePaymentStatus);
router.delete("/:id", verifyToken, isAdmin, deletePayment);

module.exports = router;