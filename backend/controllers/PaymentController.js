const Payment = require("../models/Payments");
const PaymentLogs = require("../models/PaymentLogs");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const path = require("path");
const fs = require("fs");

// Stripe initialised once at the top — never inside individual functions
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ─── 1. CREATE PAYMENT (bank slip / manual — no Stripe) ───────────────────────
const createPayment = async (req, res) => {
    const { bookingId, userId, amount, paymentMethod } = req.body;

    if (!bookingId || !userId || !amount || !paymentMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.status === 'cancelled') return res.status(400).json({ message: "Cannot pay for a cancelled booking" });

        if (booking.payment) {
            const existingPayment = await Payment.findById(booking.payment);
            if (existingPayment && existingPayment.paymentStatus === 'completed') {
                return res.status(400).json({ message: "Booking already paid" });
            }
        }

        if (amount !== booking.pricing.total) {
            return res.status(400).json({
                message: `Payment amount (${amount}) does not match booking total (${booking.pricing.total})`
            });
        }

        // Status stays 'pending' — admin confirms after reviewing the bank slip
        const payment = new Payment({
            bookingId,
            userId,
            amount,
            paymentMethod,
            paymentType: 'venue-booking',
            paymentStatus: 'pending',
        });
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Bank slip payment created for "${booking.purpose}" — amount $${amount}. Awaiting slip upload and admin approval.`,
            performedBy: userId,
        }).save();

        res.status(201).json({ message: "Payment created successfully", payment });
    } catch (err) {
        console.error('createPayment error:', err);
        return res.status(500).json({ message: "Error creating payment", error: err.message });
    }
};

// ─── 2. UPLOAD BANK SLIP ──────────────────────────────────────────────────────
// Called immediately after createPayment when the user submits a bank slip.
// Multer (configured in the route file) handles the multipart upload.
// Payment remains 'pending' — admin must manually approve via updatePaymentStatus.
const uploadBankSlip = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.paymentMethod !== 'bank') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Bank slip upload is only valid for bank transfer payments" });
        }

        if (payment.paymentStatus === 'completed') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Payment already completed — slip upload not needed" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Please attach a JPG or PNG image." });
        }

        // Delete old slip file from disk if one was previously uploaded
        if (payment.bankSlipUrl) {
            // Extract just the filename from the stored full URL and resolve to disk path
            const oldFilename = payment.bankSlipUrl.split('/uploads/bank-slips/')[1];
            if (oldFilename) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'bank-slips', oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        // Store full absolute URL using PORT from .env so the React frontend
        // (running on a different port) can load the image directly
        const port = process.env.PORT || 5000;
        payment.bankSlipUrl = `http://localhost:${port}/uploads/bank-slips/${req.file.filename}`;
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'updated',
            message: `Bank slip uploaded: ${req.file.filename}. Status remains pending until admin approval.`,
            performedBy: payment.userId,
        }).save();

        res.status(200).json({
            message: "Bank slip uploaded successfully. Awaiting admin approval.",
            payment,
        });

    } catch (err) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }
        console.error('uploadBankSlip error:', err);
        return res.status(500).json({ message: "Error uploading bank slip", error: err.message });
    }
};

// ─── 3. CREATE STRIPE PAYMENT INTENT ─────────────────────────────────────────
// Called first by the frontend before showing the Stripe card form.
// Returns a clientSecret which Stripe.js uses to securely collect card details.
// Card data never touches our backend — Stripe handles it entirely.
const createPaymentIntent = async (req, res) => {
    const { bookingId, userId, amount, paymentMethod } = req.body;

    if (!bookingId || !userId || !amount || !paymentMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.status === 'cancelled') return res.status(400).json({ message: "Cannot pay for a cancelled booking" });

        if (amount !== booking.pricing.total) {
            return res.status(400).json({
                message: `Amount (${amount}) does not match booking total (${booking.pricing.total})`
            });
        }

        // Create PaymentIntent on Stripe — amount must be in cents
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            metadata: {
                bookingId: bookingId.toString(),
                userId: userId.toString(),
            },
            description: `Venue booking: ${booking.purpose}`,
        });

        // Save a pending payment record in our DB — NOT completed yet
        // Status only changes to 'completed' after Stripe confirms success
        const payment = new Payment({
            bookingId,
            userId,
            amount,
            paymentMethod,
            paymentType: 'venue-booking',
            paymentStatus: 'pending',
            stripePaymentIntentId: paymentIntent.id,
        });
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Stripe PaymentIntent created. Intent ID: ${paymentIntent.id}`,
            performedBy: userId,
        }).save();

        // Return clientSecret to frontend — Stripe.js uses this to confirm the payment
        res.status(201).json({
            clientSecret: paymentIntent.client_secret,
            paymentId: payment._id,
        });

    } catch (err) {
        console.error('createPaymentIntent error:', err);
        return res.status(500).json({ message: "Error creating payment intent", error: err.message });
    }
};

// ─── 4. CONFIRM PAYMENT ───────────────────────────────────────────────────────
// Called by the frontend AFTER stripe.confirmCardPayment() succeeds.
// We re-verify with Stripe directly — never trust the frontend alone.
// Only marks payment as completed in DB after Stripe confirms status === 'succeeded'.
const confirmPayment = async (req, res) => {
    const paymentId = req.params.id;
    const { stripePaymentIntentId } = req.body;

    if (!stripePaymentIntentId) {
        return res.status(400).json({ message: "Stripe Payment Intent ID is required" });
    }

    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });
        if (payment.paymentStatus === 'completed') {
            return res.status(400).json({ message: "Payment already confirmed" });
        }

        // Verify with Stripe — this is the critical check
        const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                message: `Payment not confirmed by Stripe. Status: ${paymentIntent.status}`
            });
        }

        // Stripe confirmed — now safe to mark as completed in DB
        payment.paymentStatus = 'completed';
        payment.transactionId = stripePaymentIntentId;
        payment.paidAt = new Date();
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'updated',
            message: `Payment confirmed via Stripe. Intent: ${stripePaymentIntentId}`,
            performedBy: payment.userId,
        }).save();

        res.status(200).json({ message: "Payment confirmed successfully", payment });

    } catch (err) {
        console.error('confirmPayment error:', err);
        return res.status(500).json({ message: "Error confirming payment", error: err.message });
    }
};

// ─── 5. FAIL PAYMENT ─────────────────────────────────────────────────────────
// Called when Stripe declines the card on the frontend.
// Marks the pending DB record as failed so admin panel stays accurate.
const failPayment = async (req, res) => {
    const paymentId = req.params.id;
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        payment.paymentStatus = 'failed';
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'failed',
            message: 'Payment failed — declined by Stripe',
            performedBy: payment.userId,
        }).save();

        res.status(200).json({ message: "Payment marked as failed", payment });
    } catch (err) {
        console.error('failPayment error:', err);
        return res.status(500).json({ message: "Error updating payment status", error: err.message });
    }
};

// ─── 6. CREATE EVENT REGISTRATION PAYMENT ────────────────────────────────────
const createEventRegistrationPayment = async (req, res) => {
    const { eventId, userId, amount, paymentMethod } = req.body;

    if (!eventId || !userId || !amount || !paymentMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (event.status !== 'published') return res.status(400).json({ message: "Event is not open for registration" });
        if (event.pricing.isFree) return res.status(400).json({ message: "This event is free, no payment required" });
        if (amount !== event.pricing.price) {
            return res.status(400).json({
                message: `Payment amount (${amount}) does not match event price (${event.pricing.price})`
            });
        }

        const payment = new Payment({
            eventId,
            userId,
            amount,
            paymentMethod,
            paymentType: 'event-registration',
            paymentStatus: 'pending',
        });
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Event registration payment created for "${event.name}" — amount $${amount} via ${paymentMethod}`,
            performedBy: userId,
        }).save();

        res.status(201).json({ message: "Event registration payment created successfully", payment });
    } catch (err) {
        console.error('createEventRegistrationPayment error:', err);
        return res.status(500).json({ message: "Error creating event registration payment", error: err.message });
    }
};

// ─── 7. GET ALL PAYMENTS ──────────────────────────────────────────────────────
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('bookingId', 'date purpose status')
            .populate('eventId', 'name schedule.date status')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.error('getAllPayments error:', err);
        return res.status(500).json({ message: "Error fetching payments", error: err.message });
    }
};

// ─── 8. GET PAYMENT BY ID ─────────────────────────────────────────────────────
const getPaymentById = async (req, res) => {
    const paymentId = req.params.id;
    try {
        const payment = await Payment.findById(paymentId)
            .populate('bookingId')
            .populate('eventId')
            .populate('userId', 'name email');

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        res.status(200).json({ payment });
    } catch (err) {
        console.error('getPaymentById error:', err);
        return res.status(500).json({ message: "Error fetching payment", error: err.message });
    }
};

// ─── 9. GET PAYMENTS BY USER ID ───────────────────────────────────────────────
const getPaymentsByUserId = async (req, res) => {
    const userId = req.params.userId;
    try {
        const payments = await Payment.find({ userId })
            .populate('bookingId', 'date purpose')
            .populate('eventId', 'name schedule.date')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.error('getPaymentsByUserId error:', err);
        return res.status(500).json({ message: "Error fetching user payments", error: err.message });
    }
};

// ─── 10. GET PAYMENTS BY EVENT ID ─────────────────────────────────────────────
const getPaymentsByEventId = async (req, res) => {
    const eventId = req.params.eventId;
    try {
        const payments = await Payment.find({ eventId, paymentType: 'event-registration' })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.error('getPaymentsByEventId error:', err);
        return res.status(500).json({ message: "Error fetching event payments", error: err.message });
    }
};

// ─── 11. UPDATE PAYMENT STATUS (admin manual override) ────────────────────────
// This is the primary way bank slip payments get approved.
// Admin reviews bankSlipUrl image, then calls this with paymentStatus: 'completed'.
const updatePaymentStatus = async (req, res) => {
    const paymentId = req.params.id;
    const { paymentStatus, transactionId, refundReason } = req.body;

    if (!paymentStatus) {
        return res.status(400).json({ message: "Payment status is required" });
    }

    const allowed = ['pending', 'completed', 'failed', 'refunded'];
    if (!allowed.includes(paymentStatus)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        // Guard: bank slip payments should have a slip uploaded before approval
        if (
            paymentStatus === 'completed' &&
            payment.paymentMethod === 'bank' &&
            !payment.bankSlipUrl
        ) {
            return res.status(400).json({
                message: "Cannot approve a bank payment without an uploaded slip"
            });
        }

        if (paymentStatus === 'refunded' && payment.paymentStatus !== 'completed') {
            return res.status(400).json({ message: "Only completed payments can be refunded" });
        }

        payment.paymentStatus = paymentStatus;
        if (transactionId) payment.transactionId = transactionId;

        if (paymentStatus === 'completed' && !payment.paidAt) {
            payment.paidAt = new Date();
        }

        if (paymentStatus === 'refunded') {
            payment.refundedAt = new Date();
            payment.refundAmount = payment.amount;
            if (refundReason) payment.refundReason = refundReason;
        }

        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: paymentStatus === 'failed' ? 'failed' : 'updated',
            message: paymentStatus === 'refunded'
                ? `Payment refunded. Reason: ${refundReason || 'No reason provided'}. Amount: $${payment.amount}`
                : `Payment status manually updated to ${paymentStatus}`,
            performedBy: payment.userId,
        }).save();

        res.status(200).json({ message: "Payment status updated successfully", payment });
    } catch (err) {
        console.error('updatePaymentStatus error:', err);
        return res.status(500).json({ message: "Error updating payment", error: err.message });
    }
};

// ─── 12. PROCESS PAYMENT (mock — kept for non-Stripe flows / testing only) ────
const processPayment = async (req, res) => {
    const paymentId = req.params.id;
    try {
        const payment = await Payment.findById(paymentId)
            .populate('eventId', 'name')
            .populate('bookingId', 'purpose');

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        if (payment.paymentStatus === 'completed') return res.status(400).json({ message: "Payment already completed" });

        const isSuccessful = Math.random() > 0.1;

        if (isSuccessful) {
            payment.paymentStatus = 'completed';
            payment.transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
            payment.paidAt = new Date();
            await payment.save();

            const logMessage = payment.paymentType === 'event-registration'
                ? `Mock payment processed for "${payment.eventId?.name}". TXN: ${payment.transactionId}`
                : `Mock payment processed for "${payment.bookingId?.purpose}". TXN: ${payment.transactionId}`;

            await new PaymentLogs({ paymentId: payment._id, action: 'updated', message: logMessage, performedBy: payment.userId }).save();
            res.status(200).json({ message: "Payment processed successfully", payment });
        } else {
            payment.paymentStatus = 'failed';
            await payment.save();
            await new PaymentLogs({ paymentId: payment._id, action: 'failed', message: 'Mock payment failed', performedBy: payment.userId }).save();
            res.status(400).json({ message: "Payment processing failed", payment });
        }
    } catch (err) {
        console.error('processPayment error:', err);
        return res.status(500).json({ message: "Error processing payment", error: err.message });
    }
};

// ─── 13. GET PAYMENT LOGS ─────────────────────────────────────────────────────
const getPaymentLogs = async (req, res) => {
    const paymentId = req.params.id;
    try {
        const logs = await PaymentLogs.find({ paymentId })
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ logs });
    } catch (err) {
        console.error('getPaymentLogs error:', err);
        return res.status(500).json({ message: "Error fetching payment logs", error: err.message });
    }
};

// ─── 14. DELETE PAYMENT (admin only) ──────────────────────────────────────────
const deletePayment = async (req, res) => {
    const paymentId = req.params.id;
    try {
        const payment = await Payment.findByIdAndDelete(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });
        await PaymentLogs.deleteMany({ paymentId });
        res.status(200).json({ message: "Payment deleted successfully" });
    } catch (err) {
        console.error('deletePayment error:', err);
        return res.status(500).json({ message: "Error deleting payment", error: err.message });
    }
};

module.exports = {
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
};