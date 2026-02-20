const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paymentLogsSchema = new Schema({
    paymentId: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['created', 'updated', 'failed']
    },
    message: {
        type: String,
        required: true
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("PaymentLogs", paymentLogsSchema);