const mongoose = require("mongoose");
const { Schema } = mongoose;


const facilityOwnerSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  companyName: {
    type: String,
    trim: true
  },

  companyWebsite: {
    type: String,
    trim: true
  },

  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },

  verified: {
    type: Boolean,
    default: false
  },

  verificationDate: {
    type: Date
  },

  verificationDocuments: [{
    documentType: {
      type: String,
      enum: ['business_license', 'id', 'tax_id', 'ownership_proof', 'other']
    },
    url: String,
    verified: { type: Boolean, default: false }
  }],

  statistics: {
    totalFacilities: { type: Number, default: 0 },
    activeFacilities: { type: Number, default: 0 },
    verifiedFacilities: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 }
  },

  revenue: {
    totalRevenue: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    processedPayout: { type: Number, default: 0 },
    payoutFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'monthly'
    },
    lastPayoutDate: { type: Date },
    nextPayoutDate: { type: Date }
  },

  bankDetails: {
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true, select: false },
    routingNumber: { type: String, trim: true, select: false },
    bankName: { type: String, trim: true },
    accountType: { type: String, enum: ['checking', 'savings'], select: false },
    verified: { type: Boolean, default: false }
  },

  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },

  socialLinks: {
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    instagram: { type: String, trim: true },
    linkedin: { type: String, trim: true }
  },

  facilities: [{
    type: Schema.Types.ObjectId,
    ref: 'Facility'
  }],

  policies: {
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate'
    },
    cancellationDays: { type: Number, default: 3 },
    autoApproveBookings: { type: Boolean, default: false },
    securityDeposit: { type: Number, default: 0 }
  },

  compliance: {
    taxId: { type: String, select: false },
    businessLicense: { type: String, select: false },
    agreeToTerms: { type: Boolean, default: false },
    agreeToTermsDate: { type: Date }
  },

  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive', 'banned'],
    default: 'active'
  },

  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

facilityOwnerSchema.index({ user: 1 });
facilityOwnerSchema.index({ verified: 1 });
facilityOwnerSchema.index({ status: 1 });
facilityOwnerSchema.index({ 'revenue.totalRevenue': -1 });
facilityOwnerSchema.index({ 'rating.average': -1 });
facilityOwnerSchema.index({ createdAt: -1 });

facilityOwnerSchema.virtual('revenueOwed').get(function() {
  return this.revenue.totalRevenue - this.revenue.processedPayout;
});

const FacilityOwner = mongoose.model('FacilityOwner', facilityOwnerSchema);

module.exports = FacilityOwner;