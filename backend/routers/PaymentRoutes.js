const express = require("express");
const router = express.Router();
const {
    createPayment,
    createEventRegistrationPayment,
    getAllPayments,
    getPaymentById,
    getPaymentsByUserId,
    getPaymentsByEventId,
    updatePaymentStatus,
    processPayment,
    getPaymentLogs,
    deletePayment
} = require("../controllers/paymentController");
const { verifyToken, isAdmin } = require("../middleware/Authmiddleware");

// Admin routes (must be first to avoid conflicts)
router.get("/", verifyToken, isAdmin, getAllPayments);

// Event registration payment routes
router.post("/event-registration", verifyToken, createEventRegistrationPayment);
router.get("/event/:eventId", verifyToken, getPaymentsByEventId);

// User payments
router.get("/user/:userId", verifyToken, getPaymentsByUserId);

// Venue booking payment route
router.post("/", verifyToken, createPayment);

// Specific payment routes (must be after specific routes like /event-registration)
router.get("/:id", verifyToken, getPaymentById);
router.post("/:id/process", verifyToken, processPayment);
router.get("/:id/logs", verifyToken, getPaymentLogs);
router.put("/:id/status", verifyToken, isAdmin, updatePaymentStatus);
router.delete("/:id", verifyToken, isAdmin, deletePayment);

module.exports = router;