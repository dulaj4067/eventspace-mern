const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
    createPayment,
    uploadBankSlip,
    createPaymentIntent,
    confirmPayment,
    failPayment,
    createEventRegistrationPayment,
    getAllPayments,
    getPaymentById,
    getPaymentsByUserId,
    getPaymentsByEventId,
    updatePaymentStatus,
    processPayment,
    getPaymentLogs,
    deletePayment,
} = require("../controllers/PaymentController");
const { verifyToken, isAdmin } = require("../middleware/Authmiddleware");

// ─── Multer — bank slip upload ─────────────────────────────────────────────────
// Files saved to /uploads/bank-slips/ on the server.
// Make sure your Express app serves this directory as static:
//   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const slipStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'bank-slips');
        // Create folder if it doesn't exist yet
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        // e.g. slip-<paymentId>-1712345678901.jpg
        cb(null, `slip-${req.params.id}-${Date.now()}${ext}`);
    },
});

const slipFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG and PNG images are accepted'), false);
    }
};

const uploadSlip = multer({
    storage: slipStorage,
    fileFilter: slipFilter,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

// ── Admin ──────────────────────────────────────────────────────────────────────
router.get("/", verifyToken, isAdmin, getAllPayments);

// ── Event registration ─────────────────────────────────────────────────────────
router.post("/event-registration", verifyToken, createEventRegistrationPayment);
router.get("/event/:eventId", verifyToken, getPaymentsByEventId);

// ── User payments ──────────────────────────────────────────────────────────────
router.get("/user/:userId", verifyToken, getPaymentsByUserId);

// ── Stripe routes — must be BEFORE /:id to avoid route conflicts ───────────────
router.post("/create-intent", verifyToken, createPaymentIntent);

// ── Bank slip / manual payment creation ───────────────────────────────────────
router.post("/", verifyToken, createPayment);

// ── Specific payment actions ───────────────────────────────────────────────────
router.get("/:id", verifyToken, getPaymentById);
router.post("/:id/confirm", verifyToken, confirmPayment);
router.post("/:id/fail", verifyToken, failPayment);
router.post("/:id/process", verifyToken, processPayment);
router.get("/:id/logs", verifyToken, getPaymentLogs);
router.put("/:id/status", verifyToken, isAdmin, updatePaymentStatus);
router.delete("/:id", verifyToken, isAdmin, deletePayment);

// ── Bank slip upload ───────────────────────────────────────────────────────────
// POST /api/payments/:id/upload-slip
// Accepts a single file field named "bankSlip"
// Payment stays 'pending' — admin approves separately via PUT /:id/status
router.post(
    "/:id/upload-slip",
    verifyToken,
    uploadSlip.single("bankSlip"),
    uploadBankSlip
);

module.exports = router;