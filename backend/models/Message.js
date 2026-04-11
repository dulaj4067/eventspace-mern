const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  communityId: {
    type: String, // Can be "general", "facility_<id>", or "event_<id>"
    required: true,
    index: true
  },
  isDirect: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.isDirect; }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    index: true
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
