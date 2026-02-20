const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
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
    paymentMethod: {
        type: String,
        required: true,
        enum: ['card', 'bank', 'mock']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        required: false
    },
    paidAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);