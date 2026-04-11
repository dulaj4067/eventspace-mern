const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    // For venue booking payments
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        required: false
    },
    // For event registration payments
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: false
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    // Distinguish between venue booking and event registration
    paymentType: {
        type: String,
        required: true,
        enum: ['venue-booking', 'event-registration']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['card', 'bank', 'mock']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        required: false
    },
    paidAt: {
        type: Date,
        required: false
    },
    // ─── Bank slip ────────────────────────────────────────────────────────────
    // Stored path/URL of the uploaded bank transfer slip image.
    // Admin reviews this image before manually marking payment as 'completed'.
    bankSlipUrl: {
        type: String,
        default: null,
    },
    // Refund tracking
    refundedAt: {
        type: Date,
        required: false
    },
    refundReason: {
        type: String,
        required: false
    },
    refundAmount: {
        type: Number,
        required: false,
        min: 0
    },
    stripePaymentIntentId: {
        type: String,
        default: null,
    },
}, {
    timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);