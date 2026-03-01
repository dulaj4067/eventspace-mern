const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    minlength: [3, 'Event name must be at least 3 characters'],
    maxlength: [200, 'Event name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'],
    required: [true, 'Event type is required']
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  location: {
    type: String,
    trim: true
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
    date: { type: Date, required: [true, 'Event date is required'] },
    startTime: { type: String },
    endTime: { type: String }
  },
  attendance: {
    maxAttendees: { type: Number, default: 0 },
    currentAttendees: { type: Number, default: 0 },
    registrations: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['registered', 'cancelled', 'attended'],
        default: 'registered'
      },
      paymentStatus: {
        type: String,
        enum: ['not-required', 'pending', 'completed', 'failed'],
        default: 'not-required'
      },
      registeredAt: { type: Date, default: Date.now }
    }]
  },
  pricing: {
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  tags: [{ type: String, trim: true }],
  categories: [{ type: String, trim: true }],
  requirements: [{ type: String, trim: true }],
  agenda: [{
    time: { type: String },
    title: { type: String },
    description: { type: String },
    speaker: { type: String }
  }],
  speakers: [{
    name: { type: String, trim: true },
    bio: { type: String, trim: true },
    topic: { type: String, trim: true }
  }],
  sponsors: [{
    name: { type: String, trim: true },
    logo: { type: String },
    website: { type: String }
  }],
  socialMedia: {
    facebook: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    linkedin: { type: String }
  },
  resources: [{
    title: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  metrics: {
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);