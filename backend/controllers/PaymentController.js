const Payment = require("../models/Payments");
const PaymentLogs = require("../models/PaymentLogs");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

// Create a payment for venue booking
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
        // Verify booking exists
        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Check booking status
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: "Cannot pay for cancelled booking" });
        }

        // Check if already paid
        if (booking.payment) {
            const existingPayment = await Payment.findById(booking.payment);
            if (existingPayment && existingPayment.paymentStatus === 'completed') {
                return res.status(400).json({ message: "Booking already paid" });
            }
        }

        // Verify amount matches booking total
        if (amount !== booking.pricing.total) {
            return res.status(400).json({ 
                message: `Payment amount (${amount}) does not match booking total (${booking.pricing.total})` 
            });
        }

        // Create new payment for venue booking
        const payment = new Payment({
            bookingId,
            userId,
            amount,
            paymentMethod,
            paymentType: 'venue-booking',
            paymentStatus: 'pending'
        });

        await payment.save();

        // Create payment log
        const log = new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Venue booking payment created for "${booking.purpose}" with amount ${amount} via ${paymentMethod}`,
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

// Create a payment for event registration
const createEventRegistrationPayment = async (req, res) => {
    const { eventId, userId, amount, paymentMethod } = req.body;

    // Validation
    if (!eventId || !userId || !amount || !paymentMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    try {
        // Verify event exists and is published
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (event.status !== 'published') {
            return res.status(400).json({ message: "Event is not open for registration" });
        }

        if (event.pricing.isFree) {
            return res.status(400).json({ message: "This event is free, no payment required" });
        }

        // Verify amount matches event price
        if (amount !== event.pricing.price) {
            return res.status(400).json({ 
                message: `Payment amount (${amount}) does not match event price (${event.pricing.price})` 
            });
        }

        // Create new payment for event registration
        const payment = new Payment({
            eventId,
            userId,
            amount,
            paymentMethod,
            paymentType: 'event-registration',
            paymentStatus: 'pending'
        });

        await payment.save();

        // Create payment log
        const log = new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Event registration payment created for "${event.name}" with amount ${amount} via ${paymentMethod}`,
            performedBy: userId
        });

        await log.save();

        res.status(201).json({
            message: "Event registration payment created successfully",
            payment
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error creating event registration payment", error: err.message });
    }
};

// Get all payments
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('bookingId', 'date purpose status')
            .populate('eventId', 'name schedule.date status')
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
            .populate('eventId')
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
            .populate('bookingId', 'date purpose')
            .populate('eventId', 'name schedule.date')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching user payments", error: err.message });
    }
};

// Get payments by event ID
const getPaymentsByEventId = async (req, res) => {
    const eventId = req.params.eventId;

    try {
        const payments = await Payment.find({ eventId, paymentType: 'event-registration' })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching event payments", error: err.message });
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
        const payment = await Payment.findById(paymentId)
            .populate('eventId', 'name')
            .populate('bookingId', 'purpose');

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.paymentStatus === 'completed') {
            return res.status(400).json({ message: "Payment already completed" });
        }

        // Mock payment processing logic (90% success rate)
        const isSuccessful = Math.random() > 0.1;

        if (isSuccessful) {
            payment.paymentStatus = 'completed';
            payment.transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
            payment.paidAt = new Date();

            await payment.save();

            // Create success log
            let logMessage = '';
            if (payment.paymentType === 'event-registration') {
                logMessage = `Event registration payment processed successfully for "${payment.eventId?.name}". Transaction ID: ${payment.transactionId}`;
            } else {
                logMessage = `Venue booking payment processed successfully for "${payment.bookingId?.purpose}". Transaction ID: ${payment.transactionId}`;
            }

            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'updated',
                message: logMessage,
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
            const logMessage = payment.paymentType === 'event-registration'
                ? `Event registration payment processing failed - Mock payment error`
                : `Venue booking payment processing failed - Mock payment error`;

            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'failed',
                message: logMessage,
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

// Process payment with Stripe
const processStripePayment = async (req, res) => {
    const paymentId = req.params.id;

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        const payment = await Payment.findById(paymentId)
            .populate('eventId', 'name')
            .populate('bookingId', 'purpose');

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.paymentStatus === 'completed') {
            return res.status(400).json({ message: "Payment already completed" });
        }

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payment.amount * 100), // Convert to cents
            currency: 'usd',
            payment_method_types: ['card'],
            description: payment.paymentType === 'event-registration' 
                ? `Event Registration: ${payment.eventId?.name || 'Event'}`
                : `Venue Booking: ${payment.bookingId?.purpose || 'Venue'}`
        });

        // For testing, auto-confirm with test card
        const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: 'pm_card_visa'
        });

        // Check payment status
        if (confirmedPayment.status === 'succeeded') {
            payment.paymentStatus = 'completed';
            payment.transactionId = confirmedPayment.id;
            payment.paidAt = new Date();

            await payment.save();

            // Create success log
            let logMessage = '';
            if (payment.paymentType === 'event-registration') {
                logMessage = `Stripe payment processed successfully for "${payment.eventId?.name}". Transaction ID: ${confirmedPayment.id}`;
            } else {
                logMessage = `Stripe payment processed successfully for "${payment.bookingId?.purpose}". Transaction ID: ${confirmedPayment.id}`;
            }

            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'updated',
                message: logMessage,
                performedBy: payment.userId
            });

            await log.save();

            res.status(200).json({
                message: "Payment processed successfully with Stripe",
                payment,
                stripeTransactionId: confirmedPayment.id
            });
        } else {
            payment.paymentStatus = 'failed';
            await payment.save();

            const log = new PaymentLogs({
                paymentId: payment._id,
                action: 'failed',
                message: `Stripe payment failed with status: ${confirmedPayment.status}`,
                performedBy: payment.userId
            });

            await log.save();

            res.status(400).json({
                message: "Payment processing failed",
                payment,
                stripeStatus: confirmedPayment.status
            });
        }
    } catch (err) {
        console.log(err);

        // Update payment to failed
        try {
            const payment = await Payment.findById(paymentId);
            if (payment) {
                payment.paymentStatus = 'failed';
                await payment.save();

                const log = new PaymentLogs({
                    paymentId: payment._id,
                    action: 'failed',
                    message: `Stripe payment error: ${err.message}`,
                    performedBy: payment.userId
                });
                await log.save();
            }
        } catch (updateErr) {
            console.log("Error updating payment status:", updateErr);
        }

        return res.status(500).json({ 
            message: "Error processing Stripe payment", 
            error: err.message 
        });
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
    createEventRegistrationPayment,
    getAllPayments,
    getPaymentById,
    getPaymentsByUserId,
    getPaymentsByEventId,
    updatePaymentStatus,
    processPayment,
    processStripePayment,
    getPaymentLogs,
    deletePayment
};