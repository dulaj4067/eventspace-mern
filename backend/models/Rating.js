//Rating.js

// REVIEW/RATING MODEL

const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema({


  // User who wrote the review (required)

  user: {
    type: Schema.Types.ObjectId,   // Reference to the User model
    ref: 'User',
    required: [true, 'User is required']
  },

  // Facility being reviewed (optional)
 
  facility: {
    type: Schema.Types.ObjectId,   // Reference to the Facility model
    ref: 'Facility',
    default: null
  },

  
  // Event being reviewed (optional)

  event: {
    type: Schema.Types.ObjectId,   // Reference to the Event model
    ref: 'Event',
    default: null
  },


  // Booking associated with the review (required)
 
  booking: {
    type: Schema.Types.ObjectId,   // Reference to the Booking model
    ref: 'Booking',
    required: [true, 'Booking is required']
  },

 
  // Overall rating (1-5)
  
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },

  
  // Review title (short description)
  
  title: {
    type: String,
    trim: true,                     // Remove leading/trailing spaces
    maxlength: [100, 'Title cannot exceed 100 characters']
  },


  // Detailed comment/review text
  
  comment: {
    type: String,
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },

 
  // Category-specific ratings (optional)
 
  categories: {
    cleanliness: { type: Number, min: 1, max: 5 },
    amenities: { type: Number, min: 1, max: 5 },
    location: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 }
  },

  
  // Images uploaded with review (optional)
  
  images: [{
    url: { type: String, required: true }, // Image URL is required
    caption: { type: String }               // Optional caption
  }],

 
  // Has this review been verified by admin? Default false
 
  isVerified: {
    type: Boolean,
    default: false
  },

  
  // Helpful votes (users who marked this review as helpful)
 
  helpful: {
    count: { type: Number, default: 0 },  // Number of helpful votes
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Users who voted
  },

  
  // Admin or owner response to review (optional)

  response: {
    text: { type: String, trim: true },               // Response text
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Who responded
    respondedAt: { type: Date }                       // Timestamp of response
  },

 
  // Review moderation status
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'], // Only these allowed
    default: 'pending'
  }

}, {
  timestamps: true  // Automatically adds createdAt and updatedAt fields
});

//  INDEXES 

// Quick lookup reviews for a facility (latest first)
reviewSchema.index({ facility: 1, createdAt: -1 });

// Quick lookup reviews for an event (latest first)
reviewSchema.index({ event: 1, createdAt: -1 });

// Quick lookup reviews by user (latest first)
reviewSchema.index({ user: 1, createdAt: -1 });

// Lookup reviews by booking
reviewSchema.index({ booking: 1 });

// Lookup reviews by status (moderation filter)
reviewSchema.index({ status: 1 });

// = UNIQUE CONSTRAINT 

// Ensure one review per booking per user
reviewSchema.index({ user: 1, booking: 1 }, { unique: true });

//  MODEL EXPORT 
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;