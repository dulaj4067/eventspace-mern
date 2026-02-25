const Payment = require("../models/Payments");
const PaymentLogs = require("../models/PaymentLogs");

// Create a new payment
const createPayment = async (req, res) => {
    const { bookingId, userId, amount, paymentMethod } = req.body;

    // Validation
    if (!bookingId || !userId || !amount || !paymentMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    try {
        // Create new payment
        const payment = new Payment({
            bookingId,
            userId,
            amount,
            paymentMethod,
            paymentStatus: 'pending'
        });

        await payment.save();

        // Create payment log
        const log = new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Payment created with amount ${amount} via ${paymentMethod}`,
            performedBy: userId
        });

        await log.save();

        res.status(201).json({
            message: "Payment created successfully",
            payment
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error creating payment", error: err.message });
    }
};

// Get all payments
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('bookingId', 'eventName eventDate')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching payments", error: err.message });
    }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const payment = await Payment.findById(paymentId)
            .populate('bookingId')
            .populate('userId', 'name email');

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.status(200).json({ payment });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching payment", error: err.message });
    }
};

// Get payments by user ID
const getPaymentsByUserId = async (req, res) => {
    const userId = req.params.userId;

    try {
        const payments = await Payment.find({ userId })
            .populate('bookingId', 'eventName eventDate')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching user payments", error: err.message });
    }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
    const paymentId = req.params.id;
    const { paymentStatus, transactionId } = req.body;

    if (!paymentStatus) {
        return res.status(400).json({ message: "Payment status is required" });
    }

    try {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Update payment
        payment.paymentStatus = paymentStatus;
        if (transactionId) {
            payment.transactionId = transactionId;
        }

        // Set paidAt if status is completed
        if (paymentStatus === 'completed' && !payment.paidAt) {
            payment.paidAt = new Date();
        }

        await payment.save();

        // Create payment log
        const log = new PaymentLogs({
            paymentId: payment._id,
            action: paymentStatus === 'failed' ? 'failed' : 'updated',
            message: `Payment status updated to ${paymentStatus}`,
            performedBy: req.user?.id || payment.userId
        });

        await log.save();

        res.status(200).json({
            message: "Payment status updated successfully",
            payment
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error updating payment", error: err.message });
    }
};

// Process payment (mock payment processing)
const processPayment = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.paymentStatus === 'completed') {
            return res.status(400).json({ message: "Payment already completed" });
        }

        // Mock payment processing logic
        const isSuccessful = Math.random() > 0.1; // 90% success rate for mock

        if (isSuccessful) {
            payment.paymentStatus = 'completed';
            payment.transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
            payment.paidAt = new Date();

            await payment.save();

            // Create success log
            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'updated',
                message: `Payment processed successfully. Transaction ID: ${payment.transactionId}`,
                performedBy: payment.userId
            });

            await log.save();

            res.status(200).json({
                message: "Payment processed successfully",
                payment
            });
        } else {
            payment.paymentStatus = 'failed';
            await payment.save();

            // Create failure log
            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'failed',
                message: 'Payment processing failed - Mock payment error',
                performedBy: payment.userId
            });

            await log.save();

            res.status(400).json({
                message: "Payment processing failed",
                payment
            });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error processing payment", error: err.message });
    }
};

// Get payment logs
const getPaymentLogs = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const logs = await PaymentLogs.find({ paymentId })
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ logs });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching payment logs", error: err.message });
    }
};

// Delete payment (admin only)
const deletePayment = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const payment = await Payment.findByIdAndDelete(paymentId);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Delete associated logs
        await PaymentLogs.deleteMany({ paymentId });

        res.status(200).json({ message: "Payment deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error deleting payment", error: err.message });
    }
};

module.exports = {
    createPayment,
    getAllPayments,
    getPaymentById,
    getPaymentsByUserId,
    updatePaymentStatus,
    processPayment,
    getPaymentLogs,
    deletePayment
};