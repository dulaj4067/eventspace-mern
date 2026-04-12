const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendRegistrationConfirmation, sendCancellationNotice } = require('../services/emailService');

/* ---------------------------------------------------
   Utility: Validate Mongo ID
--------------------------------------------------- */
const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/* ---------------------------------------------------
   Utility: Validate Time Format HH:MM
--------------------------------------------------- */
const isValidTimeFormat = (time) =>
  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

/* ---------------------------------------------------
   CREATE EVENT
   - Any logged in user can create an event
   - The creator automatically becomes the organizer
--------------------------------------------------- */
exports.createEvent = async (req, res) => {
  try {
    const { name, type, facility, schedule, pricing, visibility } = req.body;

    // ── Input Validation ────────────────────────────────────────────
    const errors = [];

    if (!name || name.trim().length < 3 || name.trim().length > 200)
      errors.push('Event name must be between 3 and 200 characters');

    if (!type || !['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'].includes(type))
      errors.push('Invalid event type. Must be one of: conference, seminar, workshop, concert, exhibition, sports, social, other');

    if (!facility)
      errors.push('Facility is required');

    if (facility && !isValidObjectId(facility))
      errors.push('Invalid facility ID format');

    if (!schedule?.date)
      errors.push('Event date is required');

    if (schedule?.startTime && !isValidTimeFormat(schedule.startTime))
      errors.push('Invalid start time format. Use HH:MM');

    if (schedule?.endTime && !isValidTimeFormat(schedule.endTime))
      errors.push('Invalid end time format. Use HH:MM');

    if (pricing?.price !== undefined && pricing.price < 0)
      errors.push('Price must be a positive number');

    if (visibility && !['public', 'private'].includes(visibility))
      errors.push('Visibility must be public or private');

    if (errors.length > 0)
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    // ───────────────────────────────────────────────────────────────

    // Event time validation
    if (schedule?.startTime && schedule?.endTime) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (endTotal <= startTotal) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    // Prevent creating event with a past date
    if (schedule?.date && new Date(schedule.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future'
      });
    }

    const event = await Event.create({
      ...req.body,
      organizer: req.user._id  // Always take from JWT, not from client
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ---------------------------------------------------
   GET ALL EVENTS (Filtering + Pagination + Sorting)
   - Public: anyone can view
--------------------------------------------------- */
exports.getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      visibility,
      search,
      tag,
      startDate,
      endDate,
      isFree,
      sortBy = 'schedule.date',
      sortOrder = 'asc'
    } = req.query;

    // ── Input Validation ────────────────────────────────────────────
    const errors = [];

    if (page && isNaN(parseInt(page)))
      errors.push('Page must be a number');

    if (limit && isNaN(parseInt(limit)))
      errors.push('Limit must be a number');

    if (status && !['draft', 'published', 'cancelled', 'completed'].includes(status))
      errors.push('Invalid status value');

    if (type && !['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'].includes(type))
      errors.push('Invalid event type');

    if (visibility && !['public', 'private'].includes(visibility))
      errors.push('Visibility must be public or private');

    if (errors.length > 0)
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    // ───────────────────────────────────────────────────────────────

    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (visibility) filter.visibility = visibility;
    if (tag) filter.tags = tag.toLowerCase();
    if (isFree !== undefined)
      filter['pricing.isFree'] = isFree === 'true';

    if (startDate || endDate) {
      filter['schedule.date'] = {};
      if (startDate)
        filter['schedule.date'].$gte = new Date(startDate);
      if (endDate)
        filter['schedule.date'].$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const allowedSortFields = [
      'schedule.date',
      'createdAt',
      'metrics.views'
    ];

    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'schedule.date';

    const sortObj = {
      [sortField]: sortOrder === 'asc' ? 1 : -1
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name email')
        .populate('facility', 'name location')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),

      Event.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: events,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ---------------------------------------------------
   GET EVENT BY ID
   - Public: anyone can view
--------------------------------------------------- */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });

    const event = await Event.findById(id)
      .populate('organizer', 'name email')
      .populate('facility', 'name location')
      .populate('attendance.registrations.user', 'name email');

    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    // Increment views safely
    await Event.updateOne(
      { _id: id },
      { $inc: { 'metrics.views': 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: event
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ---------------------------------------------------
   UPDATE EVENT
   - Admin: can update any event
   - Organizer: can only update their own event
   - Any User: not authorized
--------------------------------------------------- */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });

    if (!req.user)
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });

    // ── Input Validation ────────────────────────────────────────────
    const errors = [];

    if (req.body.name !== undefined && (req.body.name.trim().length < 3 || req.body.name.trim().length > 200))
      errors.push('Event name must be between 3 and 200 characters');

    if (req.body.type !== undefined && !['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'].includes(req.body.type))
      errors.push('Invalid event type');

    if (req.body.schedule?.startTime && !isValidTimeFormat(req.body.schedule.startTime))
      errors.push('Invalid start time format. Use HH:MM');

    if (req.body.schedule?.endTime && !isValidTimeFormat(req.body.schedule.endTime))
      errors.push('Invalid end time format. Use HH:MM');

    if (req.body.pricing?.price !== undefined && req.body.pricing.price < 0)
      errors.push('Price must be a positive number');

    if (errors.length > 0)
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    // ───────────────────────────────────────────────────────────────

    const event = await Event.findById(id);
    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    if (event.status === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Cannot update a cancelled event'
      });

    if (event.status === 'published')
      return res.status(400).json({
        success: false,
        message: 'Cannot update a published event. Unpublish first.'
      });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });

    const allowedFields = [
      'name', 'description', 'location', 'tags', 'categories',
      'requirements', 'agenda', 'speakers', 'sponsors',
      'socialMedia', 'resources', 'schedule'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    if (updates.schedule?.date && new Date(updates.schedule.date) < new Date())
      return res.status(400).json({ success: false, message: 'Event date must be in the future' });

    if (updates.schedule?.startTime && !updates.schedule?.endTime)
      return res.status(400).json({ success: false, message: 'End time is required when updating start time' });

    if (updates.schedule?.endTime && !updates.schedule?.startTime)
      return res.status(400).json({ success: false, message: 'Start time is required when updating end time' });

    if (updates.schedule?.startTime && updates.schedule?.endTime) {
      const [startH, startM] = updates.schedule.startTime.split(':').map(Number);
      const [endH, endM] = updates.schedule.endTime.split(':').map(Number);

      if ((endH * 60 + endM) <= (startH * 60 + startM))
        return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('organizer', 'name email')
      .populate('facility', 'name location');

    if (!updated)
      return res.status(404).json({ success: false, message: 'Event not found' });

    res.status(200).json({ success: true, message: 'Event updated successfully', data: updated });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   DELETE EVENT
   - Admin: can delete any event
   - Organizer: can only delete their own event
   - Any User: not authorized
--------------------------------------------------- */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });

    await Event.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   PUBLISH EVENT
   - Admin: can publish any event
   - Organizer: can only publish their own event
   - Validates booking is confirmed before publishing
--------------------------------------------------- */
exports.publishEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to publish this event' });

    if (event.status === 'published')
      return res.status(400).json({ success: false, message: 'Event already published' });

    if (event.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Cannot publish a cancelled event' });

    // ── Booking Validation ──────────────────────────────────────────
    let booking = await Booking.findById(event.booking);
    
    // ─── LINKAGE FALLBACK ───────────────────────────────────────────
    // If no booking linked directly, try to find one that references this event
    if (!booking) {
      // Fallback 1: By direct reference (if the event ID is stored on the booking)
      booking = await Booking.findOne({ event: event._id });

      // Fallback 2: Match by exact schedule and capacity
      if (!booking) {
        booking = await Booking.findOne({
          user: event.organizer,
          facility: event.facility,
          date: event.schedule.date,
          startTime: event.schedule.startTime,
          endTime: event.schedule.endTime,
          'attendees.expected': event.attendance.maxAttendees,
          status: { $ne: 'cancelled' }
        });
      }

      if (booking) {
        event.booking = booking._id;
        await event.save();
      }
    }
    // ───────────────────────────────────────────────────────────────

    if (!booking)
      return res.status(400).json({ success: false, message: 'No booking linked to this event. Please book a facility first.' });

    if (booking.status !== 'confirmed') {
      // Defensive check: Maybe the payment is completed but booking status didn't update (previous bug)
      const Payment = require('../models/Payments');
      const payment = await Payment.findOne({ bookingId: booking._id, paymentStatus: 'completed' });
      
      if (payment) {
        booking.status = 'confirmed';
        booking.statusHistory.push({
          status: 'confirmed',
          changedBy: event.organizer,
          reason: 'Auto-confirmed during publish because a completed payment was found.'
        });
        await booking.save();
      } else {
        return res.status(400).json({ success: false, message: 'Booking must be confirmed before publishing event' });
      }
    }

    if (new Date(booking.date).toDateString() !== new Date(event.schedule.date).toDateString())
      return res.status(400).json({ success: false, message: 'Booking date does not match event date' });

    if (booking.facility.toString() !== event.facility.toString())
      return res.status(400).json({ success: false, message: 'Booking facility does not match event facility' });
    // ───────────────────────────────────────────────────────────────

    event.status = 'published';
    await event.save();

    res.status(200).json({ success: true, message: 'Event published successfully', data: event });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   CANCEL EVENT
   - Admin: can cancel any event
   - Organizer: can only cancel their own event
   - Sends cancellation email to all registered users
--------------------------------------------------- */
exports.cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this event' });

    if (event.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Event already cancelled' });

    event.status = 'cancelled';
    await event.save();

    // ── Send cancellation emails to all registered users ────────────
    try {
      const populated = await Event.findById(id)
        .populate('attendance.registrations.user', 'name email');

      const activeRegistrations = populated.attendance.registrations
        .filter(r => r.status !== 'cancelled');

      for (const reg of activeRegistrations) {
        if (reg.user?.email)
          await sendCancellationNotice(reg.user.email, reg.user.name, event.name);
      }
    } catch (emailError) {
      console.error('Cancellation emails failed:', emailError.message);
    }
    // ───────────────────────────────────────────────────────────────

    res.status(200).json({ success: true, message: 'Event cancelled successfully', data: event });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   REGISTER FOR EVENT (Concurrency Safe + Validations)
   - Any logged in user can register
   - Sends confirmation email after registration
--------------------------------------------------- */
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // ── Input Validation ────────────────────────────────────────────
    const errors = [];

    if (!isValidObjectId(id))
      errors.push('Invalid event ID format');

    if (!userId)
      errors.push('User ID is required');

    if (userId && !isValidObjectId(userId))
      errors.push('Invalid user ID format');

    if (errors.length > 0)
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    // ───────────────────────────────────────────────────────────────

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.status !== 'published')
      return res.status(400).json({ success: false, message: 'Event is not open for registration' });

    const today = new Date();
    if (event.schedule.date < today.setHours(0, 0, 0, 0))
      return res.status(400).json({ success: false, message: 'Cannot register for past events' });

    const alreadyRegistered = event.attendance.registrations.some(
      r => r.user.toString() === userId && r.status !== 'cancelled'
    );

    if (alreadyRegistered)
      return res.status(400).json({ success: false, message: 'User already registered' });

    // ── Payment Enforcement ─────────────────────────────────────────────────────
    if (!event.pricing.isFree) {
      const { paymentId } = req.body;
      if (!paymentId) {
        // First call — tell frontend payment is required
        return res.status(200).json({
          success: true,
          paymentRequired: true,
          amount: event.pricing.price,
          currency: event.pricing.currency,
        });
      }
      // Second call (after payment) — verify the payment exists and belongs to this event
      const Payment = require('../models/Payments');
      const payment = await Payment.findById(paymentId);
      if (!payment || payment.eventId?.toString() !== id || payment.userId?.toString() !== userId) {
        return res.status(400).json({ success: false, message: 'Invalid payment reference.' });
      }
      // Allow through — registration proceeds below
    }
    // ───────────────────────────────────────────────────────────────

    // Concurrency-safe registration using atomic $inc and $push
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, 'attendance.currentAttendees': { $lt: event.attendance.maxAttendees } },
      {
        $push: {
          'attendance.registrations': {
            user: userId,
            status: 'registered',
            paymentStatus: 'not-required'
          }
        },
        $inc: { 'attendance.currentAttendees': 1 }
      },
      { new: true }
    );

    if (!updatedEvent)
      return res.status(400).json({ success: false, message: 'Event is fully booked' });

    // ── Send confirmation email ──────────────────────────────────────
    try {
      const user = await User.findById(userId).select('name email');
      if (user) {
        await sendRegistrationConfirmation(
          user.email,
          user.name,
          updatedEvent.name,
          updatedEvent.schedule.date
        );
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }
    // ───────────────────────────────────────────────────────────────

    res.status(200).json({ success: true, message: 'Successfully registered', data: updatedEvent });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   CANCEL REGISTRATION
   - Any logged in user can cancel their own registration
--------------------------------------------------- */
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // ── Input Validation ────────────────────────────────────────────
    const errors = [];

    if (!isValidObjectId(id))
      errors.push('Invalid event ID format');

    if (!userId)
      errors.push('User ID is required');

    if (userId && !isValidObjectId(userId))
      errors.push('Invalid user ID format');

    if (errors.length > 0)
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    // ───────────────────────────────────────────────────────────────

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    const registration = event.attendance.registrations.find(
      r => r.user.toString() === userId && r.status !== 'cancelled'
    );

    if (!registration)
      return res.status(404).json({ success: false, message: 'Registration not found' });

    await Event.updateOne(
      { _id: id, 'attendance.registrations._id': registration._id },
      {
        $set: { 'attendance.registrations.$.status': 'cancelled' },
        $inc: { 'attendance.currentAttendees': -1 }
      }
    );

    res.status(200).json({ success: true, message: 'Registration cancelled successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   GET EVENT ATTENDEES
   - Admin: can view attendees of any event
   - Organizer: can only view attendees of their own event
   - Any User: not authorized
--------------------------------------------------- */
exports.getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const event = await Event.findById(id)
      .populate('attendance.registrations.user', 'name email');

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to view attendees for this event' });

    const attendees = event.attendance.registrations.filter(r => r.status !== 'cancelled');

    res.status(200).json({ success: true, message: 'Attendees retrieved successfully', data: attendees });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   GET MY EVENTS (ORGANIZER)
   - Returns all events created by a specific organizer
--------------------------------------------------- */
exports.getMyEvents = async (req, res) => {
  try {
    const { organizerId } = req.params;

    if (!isValidObjectId(organizerId))
      return res.status(400).json({ success: false, message: 'Invalid organizer ID format' });

    const events = await Event.find({ organizer: organizerId })
      .populate('facility', 'name location')
      .sort({ 'schedule.date': -1 });

    res.status(200).json({ success: true, message: 'Organizer events retrieved successfully', data: events });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------------------------------------------
   COMPLETE EVENT
   - Admin: can complete any event
   - Organizer: can only complete their own event
   - Event must be published and date must be in the past
--------------------------------------------------- */
exports.completeEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (event.status !== 'published')
      return res.status(400).json({ success: false, message: 'Only published events can be marked as completed' });

    if (new Date(event.schedule.date) > new Date())
      return res.status(400).json({ success: false, message: 'Cannot complete a future event' });

    event.status = 'completed';
    await event.save();

    res.status(200).json({ success: true, message: 'Event marked as completed', data: event });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};