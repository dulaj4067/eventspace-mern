const mongoose = require("mongoose");
const { Schema } = mongoose;

const facilitySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    trim: true,
    minlength: [3, 'Facility name must be at least 3 characters long'],
    maxlength: [200, 'Facility name cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Facility type is required'],
    enum: [
      'Conference Room',
      'Meeting Room',
      'Auditorium',
      'Studio',
      'Fitness Center',
      'Dining Hall',
      'Kitchen',
      'Outdoor Space',
      'Sports Facility',
      'Multipurpose Hall',
      'Other'
    ]
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10000']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Hourly rate cannot be negative']
  },
  images: [{
    url: { type: String, required: true },
    caption: { type: String },
    isPrimary: { type: Boolean, default: false }
  }],
  location: {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    }
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'unavailable', 'maintenance'],
      default: 'available'
    },
    schedule: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      },
      sunday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '06:00' },
        closeTime: { type: String, default: '22:00' }
      }
    },
    exceptions: [{
      date: { type: Date, required: true },
      isClosed: { type: Boolean, default: true },
      reason: { type: String, trim: true }
    }]
  },
  rules: [{
    type: String,
    trim: true
  }],
  contactPerson: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  metadata: {
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
facilitySchema.index({ type: 1 });
facilitySchema.index({ 'availability.status': 1 });
facilitySchema.index({ hourlyRate: 1 });
facilitySchema.index({ capacity: 1 });
facilitySchema.index({ isActive: 1 });

// Virtual for primary image
facilitySchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

const Facility = mongoose.model('Facility', facilitySchema);
module.exports = Facility;