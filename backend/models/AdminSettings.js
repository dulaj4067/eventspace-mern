const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSettingsSchema = new Schema({
  siteName: {
    type: String,
    default: 'Community Booking System',
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  contactPhone: {
    type: String,
    trim: true
  },
  businessHours: {
    weekdays: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '17:00' }
    },
    weekends: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '16:00' }
    }
  },
  bookingSettings: {
    requireApproval: { type: Boolean, default: true },
    advanceBookingDays: { type: Number, default: 90 },
    minBookingDuration: { type: Number, default: 1 }, // In hours
    maxBookingDuration: { type: Number, default: 8 }, // In hours
    cancellationPolicy: {
      hours: { type: Number, default: 24 },
      refundPercentage: { type: Number, default: 100 }
    }
  },
  paymentSettings: {
    serviceFeePercentage: { type: Number, default: 5 },
    currency: { type: String, default: 'USD' },
    taxPercentage: { type: Number, default: 0 },
    acceptedMethods: [{
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash']
    }]
  },
  emailSettings: {
    fromEmail: { type: String },
    fromName: { type: String },
    templates: {
      bookingConfirmation: { type: String },
      bookingCancellation: { type: String },
      bookingReminder: { type: String },
      eventReminder: { type: String }
    }
  },
  maintenance: {
    isUnderMaintenance: { type: Boolean, default: false },
    maintenanceMessage: { type: String },
    allowedIPs: [{ type: String }]
  },
  features: {
    enableEvents: { type: Boolean, default: true },
    enableReviews: { type: Boolean, default: true },
    enableNotifications: { type: Boolean, default: true },
    enablePayments: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

const AdminSettings = mongoose.model("AdminSettings", adminSettingsSchema);

module.exports = AdminSettings;