//  BOOKING MODEL
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookingSchema = new Schema({

    //User who made the booking
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },

    //Facility being booked
  facility: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    required: [true, 'Facility is required']
  },

    //Associated event (optional)
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    default: null 
  },

    //Booking date and time
  date: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: { //start time in HH:MM fromat
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, ' provide time in HH:MM format']
  },
  endTime: { //end time 
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, ' provide time in HH:MM format']
  },
  duration: { // Duration in hours
    type: Number, 
    required: true
  },

    //Purpose of the booking
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    trim: true,
    minlength: [5, 'Purpose must be at least 5 characters long'],
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },

    //Attendees information
  attendees: {
    expected: { type: Number, min: 1 },
    actual: { type: Number, min: 0 }
  },

    // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending'
  },

    // Pricing details
  pricing: {
    hourlyRate: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },

    //payment details
  payment: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },

    //Notes for user and admin
  notes: {
    userNotes: { type: String, trim: true, maxlength: 1000 },
    adminNotes: { type: String, trim: true, maxlength: 1000 }
  },

    //Special requests
  specialRequests: [{
    type: String,
    trim: true
  }],

    //Cancellation details
  cancellation: {
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'processed', 'failed'],
      default: 'none'
    }
  },

    //Booking status history
  statusHistory: [{
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true }
  }]
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ user: 1, date: -1 });
bookingSchema.index({ facility: 1, date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ date: 1, startTime: 1 });
bookingSchema.index({ createdAt: -1 });

// Compound index to prevent double bookings
bookingSchema.index({ facility: 1, date: 1, startTime: 1, endTime: 1 });

// Virtual for formatted date range
bookingSchema.virtual('dateRange').get(function() {
  return `${this.date.toLocaleDateString()} ${this.startTime} - ${this.endTime}`;
});

const Booking = mongoose.model('Booking', bookingSchema);