const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      minlength: [3, 'Event name must be at least 3 characters long'],
      maxlength: [200, 'Event name cannot exceed 200 characters']
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['Workshop', 'Meeting', 'Class', 'Performance', 'Social Gathering', 'Exhibition', 'Conference', 'Seminar', 'Sports', 'Festival', 'Competition', 'Other']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required']
    },
    facility: {
      type: Schema.Types.ObjectId,
      ref: 'Facility',
      required: [true, 'Facility is required']
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    schedule: {
      date: {
        type: Date,
        required: [true, 'Event date is required']
      },
      startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
      },
      endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
      },
      duration: { type: Number },
      timezone: { type: String, default: 'UTC' }
    },
    location: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    attendance: {
      maxAttendees: {
        type: Number,
        required: [true, 'Maximum attendees is required'],
        min: [1, 'Maximum attendees must be at least 1']
      },
      currentAttendees: {
        type: Number,
        default: 0,
        min: 0
      },
      registrations: [{
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        registeredAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['registered', 'confirmed', 'cancelled', 'attended', 'no-show'],
          default: 'registered'
        },
        paymentStatus: {
          type: String,
          enum: ['not-required', 'pending', 'paid', 'refunded'],
          default: 'not-required'
        },
        checkInTime: { type: Date }
      }]
    },
    pricing: {
      isFree: { type: Boolean, default: true },
      ticketPrice: { type: Number, default: 0, min: 0 },
      earlyBirdPrice: { type: Number, default: 0, min: 0 },
      earlyBirdDeadline: { type: Date }
    },
    images: [{
      url: { type: String, required: true },
      caption: { type: String },
      isPrimary: { type: Boolean, default: false }
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed', 'in-progress'],
      default: 'draft'
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public'
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    categories: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],
    agenda: [{
      time: { type: String },
      title: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      speaker: { type: String, trim: true }
    }],
    speakers: [{
      name: { type: String, required: true, trim: true },
      title: { type: String, trim: true },
      bio: { type: String, trim: true },
      photo: { type: String },
      socialLinks: {
        linkedin: { type: String },
        twitter: { type: String },
        website: { type: String }
      }
    }],
    sponsors: [{
      name: { type: String, required: true, trim: true },
      logo: { type: String },
      website: { type: String },
      tier: {
        type: String,
        enum: ['platinum', 'gold', 'silver', 'bronze', 'supporter'],
        default: 'supporter'
      }
    }],
    socialMedia: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String }
    },
    resources: [{
      title: { type: String, required: true, trim: true },
      url: { type: String, required: true },
      type: {
        type: String,
        enum: ['document', 'video', 'link', 'other'],
        default: 'link'
      }
    }],
    metrics: {
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
      }
    },
    notifications: {
      reminderSent: { type: Boolean, default: false },
      confirmationSent: { type: Boolean, default: false }
    },
    isRecurring: { type: Boolean, default: false },
    recurrence: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        default: null
      },
      interval: { type: Number, min: 1 },
      endDate: { type: Date },
      occurrences: { type: Number }
    }
  },
  { timestamps: true }
);

// Indexes
eventSchema.index({ organizer: 1, 'schedule.date': -1 });
eventSchema.index({ facility: 1, 'schedule.date': 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ visibility: 1 });
eventSchema.index({ 'schedule.date': 1 });
eventSchema.index({ tags: 1 });

// Virtual: primary image
eventSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual: available spots
eventSchema.virtual('availableSpots').get(function () {
  return this.attendance.maxAttendees - this.attendance.currentAttendees;
});

// Virtual: is full
eventSchema.virtual('isFull').get(function () {
  return this.attendance.currentAttendees >= this.attendance.maxAttendees;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
