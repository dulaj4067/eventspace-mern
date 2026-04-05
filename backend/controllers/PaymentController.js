const Payment = require("../models/Payments");
const PaymentLogs = require("../models/PaymentLogs");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

// Create a payment for venue booking
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
        if (booking.status === 'cancelled') return res.status(400).json({ message: "Cannot pay for cancelled booking" });

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

        const payment = new Payment({
            bookingId, userId, amount, paymentMethod,
            paymentType: 'venue-booking',
            paymentStatus: 'pending'
        });
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Venue booking payment created for "${booking.purpose}" with amount ${amount} via ${paymentMethod}`,
            performedBy: userId
        }).save();

        res.status(201).json({ message: "Payment created successfully", payment });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error creating payment", error: err.message });
    }
};

// Create a payment for event registration
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
            eventId, userId, amount, paymentMethod,
            paymentType: 'event-registration',
            paymentStatus: 'pending'
        });
        await payment.save();

        await new PaymentLogs({
            paymentId: payment._id,
            action: 'created',
            message: `Event registration payment created for "${event.name}" with amount ${amount} via ${paymentMethod}`,
            performedBy: userId
        }).save();

        res.status(201).json({ message: "Event registration payment created successfully", payment });
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

        if (!payment) return res.status(404).json({ message: "Payment not found" });
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

// Update payment status (admin manual override)
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

        // Guard: can only refund a completed payment
        if (paymentStatus === 'refunded' && payment.paymentStatus !== 'completed') {
            return res.status(400).json({ message: "Only completed payments can be refunded" });
        }

        payment.paymentStatus = paymentStatus;

        if (transactionId) payment.transactionId = transactionId;

        // Set paidAt when marking completed
        if (paymentStatus === 'completed' && !payment.paidAt) {
            payment.paidAt = new Date();
        }

        // Set refund fields when marking refunded
        if (paymentStatus === 'refunded') {
            payment.refundedAt = new Date();
            payment.refundAmount = payment.amount;
            if (refundReason) payment.refundReason = refundReason;
        }

        await payment.save();

        // ✅ FIX 1: 'refunded' is not in PaymentLogs enum — map it to 'updated'
        // ✅ FIX 2: use payment.userId directly — req.user may be undefined
        await new PaymentLogs({
            paymentId: payment._id,
            action: paymentStatus === 'failed' ? 'failed' : 'updated',
            message: paymentStatus === 'refunded'
                ? `Payment refunded. Reason: ${refundReason || 'No reason provided'}. Amount: $${payment.amount}`
                : `Payment status updated to ${paymentStatus}`,
            performedBy: payment.userId
        }).save();

        res.status(200).json({ message: "Payment status updated successfully", payment });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error updating payment", error: err.message });
    }
};

// Process payment (mock — 90% success)
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
                ? `Event registration payment processed for "${payment.eventId?.name}". TXN: ${payment.transactionId}`
                : `Venue booking payment processed for "${payment.bookingId?.purpose}". TXN: ${payment.transactionId}`;

            await new PaymentLogs({ paymentId: payment._id, action: 'updated', message: logMessage, performedBy: payment.userId }).save();
            res.status(200).json({ message: "Payment processed successfully", payment });
        } else {
            payment.paymentStatus = 'failed';
            await payment.save();

            const logMessage = payment.paymentType === 'event-registration'
                ? `Event registration payment failed - Mock error`
                : `Venue booking payment failed - Mock error`;

            await new PaymentLogs({ paymentId: payment._id, action: 'failed', message: logMessage, performedBy: payment.userId }).save();
            res.status(400).json({ message: "Payment processing failed", payment });
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

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        if (payment.paymentStatus === 'completed') return res.status(400).json({ message: "Payment already completed" });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payment.amount * 100),
            currency: 'usd',
            payment_method_types: ['card'],
            description: payment.paymentType === 'event-registration'
                ? `Event Registration: ${payment.eventId?.name || 'Event'}`
                : `Venue Booking: ${payment.bookingId?.purpose || 'Venue'}`
        });

        const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: 'pm_card_visa'
        });

        if (confirmedPayment.status === 'succeeded') {
            payment.paymentStatus = 'completed';
            payment.transactionId = confirmedPayment.id;
            payment.paidAt = new Date();
            await payment.save();

            const logMessage = payment.paymentType === 'event-registration'
                ? `Stripe payment processed for "${payment.eventId?.name}". TXN: ${confirmedPayment.id}`
                : `Stripe payment processed for "${payment.bookingId?.purpose}". TXN: ${confirmedPayment.id}`;

            await new PaymentLogs({ paymentId: payment._id, action: 'updated', message: logMessage, performedBy: payment.userId }).save();
            res.status(200).json({ message: "Payment processed successfully with Stripe", payment, stripeTransactionId: confirmedPayment.id });
        } else {
            payment.paymentStatus = 'failed';
            await payment.save();
            await new PaymentLogs({ paymentId: payment._id, action: 'failed', message: `Stripe payment failed: ${confirmedPayment.status}`, performedBy: payment.userId }).save();
            res.status(400).json({ message: "Payment processing failed", payment, stripeStatus: confirmedPayment.status });
        }
    } catch (err) {
        console.log(err);
        try {
            const payment = await Payment.findById(paymentId);
            if (payment) {
                payment.paymentStatus = 'failed';
                await payment.save();
                await new PaymentLogs({ paymentId: payment._id, action: 'failed', message: `Stripe error: ${err.message}`, performedBy: payment.userId }).save();
            }
        } catch (updateErr) {
            console.log("Error updating payment status:", updateErr);
        }
        return res.status(500).json({ message: "Error processing Stripe payment", error: err.message });
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
        if (!payment) return res.status(404).json({ message: "Payment not found" });
        await PaymentLogs.deleteMany({ paymentId });
        res.status(200).json({ message: "Payment deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error deleting payment", error: err.message });
    }
};

// Get payments received by user (as owner or organizer)
const getReceivedPayments = async (req, res) => {
    const userId = req.user._id;
    try {
        const Facility = require("../models/Facilities");
        const Event = require("../models/Event");

        // Find facilities owned by the user
        const userFacilities = await Facility.find({ owner: userId }).select('_id');
        const facilityIds = userFacilities.map(f => f._id);

        // Find events organized by the user
        const userEvents = await Event.find({ organizer: userId }).select('_id');
        const eventIds = userEvents.map(e => e._id);

        // Find all bookings for those facilities to get their IDs
        const facilityBookings = await Booking.find({ facility: { $in: facilityIds } }).select('_id');
        const bookingIds = facilityBookings.map(b => b._id);

        // Find payments linked to user's events OR user's facility bookings
        const payments = await Payment.find({
            $or: [
                { eventId: { $in: eventIds } },
                { bookingId: { $in: bookingIds } }
            ]
        })
        .populate('bookingId', 'date purpose')
        .populate('eventId', 'name schedule.date')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

        res.status(200).json({ payments });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching received payments", error: err.message });
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
    getReceivedPayments,
    deletePayment
};