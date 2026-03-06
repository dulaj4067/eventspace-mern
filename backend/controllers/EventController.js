const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking'); // Required for publishEvent booking validation

/* ---------------------------------------------------
   Utility: Validate Mongo ID
--------------------------------------------------- */
const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/* ---------------------------------------------------
   CREATE EVENT
   - Any logged in user can create an event
   - The creator automatically becomes the organizer
--------------------------------------------------- */
exports.createEvent = async (req, res) => {
  try {
    const { schedule } = req.body;

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

    const event = await Event.create(req.body);

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

    const event = await Event.findById(id);
    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    // Cannot edit cancelled or already published events
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

    // Only admin or the organizer who created the event can update
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });

    const allowedFields = [
      'name',
      'description',
      'location',
      'tags',
      'categories',
      'requirements',
      'agenda',
      'speakers',
      'sponsors',
      'socialMedia',
      'resources',
      'schedule'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    // Prevent updating to a past date
    if (updates.schedule?.date && new Date(updates.schedule.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future'
      });
    }

    // Partial time validation — both must be provided together
    if (updates.schedule?.startTime && !updates.schedule?.endTime)
      return res.status(400).json({
        success: false,
        message: 'End time is required when updating start time'
      });

    if (updates.schedule?.endTime && !updates.schedule?.startTime)
      return res.status(400).json({
        success: false,
        message: 'Start time is required when updating end time'
      });

    // Event time validation if schedule is updated
    if (updates.schedule?.startTime && updates.schedule?.endTime) {
      const [startH, startM] = updates.schedule.startTime.split(':').map(Number);
      const [endH, endM] = updates.schedule.endTime.split(':').map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (endTotal <= startTotal) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('organizer', 'name email')
      .populate('facility', 'name location');

    if (!updated)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updated
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
   DELETE EVENT
   - Admin: can delete any event
   - Organizer: can only delete their own event
   - Any User: not authorized
--------------------------------------------------- */
exports.deleteEvent = async (req, res) => {
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

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    // Only admin or the organizer who created the event can delete
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });

    await Event.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ---------------------------------------------------
   PUBLISH EVENT
   - Admin: can publish any event
   - Organizer: can only publish their own event
   - Any User: not authorized
   - Validates booking is confirmed before publishing
   - Ensures booking date matches event date
   - Ensures booking facility matches event facility
--------------------------------------------------- */
exports.publishEvent = async (req, res) => {
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

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    // Only admin or the organizer who created the event can publish
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this event'
      });

    if (event.status === 'published')
      return res.status(400).json({
        success: false,
        message: 'Event already published'
      });

    if (event.status === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Cannot publish a cancelled event'
      });

    // ── Booking Validation ──────────────────────────────────────────
    // Booking Service owns approval logic. We only read the result here.
    const booking = await Booking.findById(event.booking);

    if (!booking)
      return res.status(400).json({
        success: false,
        message: 'No booking linked to this event'
      });

    // Booking must be confirmed (approved by admin via Booking Service)
    if (booking.status !== 'confirmed')
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed before publishing event'
      });

    // Booking date must match event schedule date
    const bookingDate = new Date(booking.date).toDateString();
    const eventDate = new Date(event.schedule.date).toDateString();

    if (bookingDate !== eventDate)
      return res.status(400).json({
        success: false,
        message: 'Booking date does not match event date'
      });

    // Booking facility must match event facility
    if (booking.facility.toString() !== event.facility.toString())
      return res.status(400).json({
        success: false,
        message: 'Booking facility does not match event facility'
      });
    // ───────────────────────────────────────────────────────────────

    event.status = 'published';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
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
   CANCEL EVENT
   - Admin: can cancel any event
   - Organizer: can only cancel their own event
   - Any User: not authorized
--------------------------------------------------- */
exports.cancelEvent = async (req, res) => {
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

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });

    // Only admin or the organizer who created the event can cancel
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this event'
      });

    if (event.status === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Event already cancelled'
      });

    event.status = 'cancelled';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
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
   REGISTER FOR EVENT (Concurrency Safe + Validations)
   - Any logged in user can register
--------------------------------------------------- */
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!userId)
      return res.status(400).json({ success: false, message: 'User ID is required' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    // Single status check covers both 'not published' and 'cancelled' cases
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

    // TODO: Payment enforcement
    // - Only allow confirming registration after payment is completed
    // - Do not enforce payment completion here
    // - Payment integration is handled by the Payment Module

    // Concurrency-safe registration using atomic $inc and $push
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, 'attendance.currentAttendees': { $lt: event.attendance.maxAttendees } },
      {
        $push: {
          'attendance.registrations': {
            user: userId,
            status: 'registered',
            paymentStatus: event.pricing.isFree ? 'not-required' : 'pending'
          }
        },
        $inc: { 'attendance.currentAttendees': 1 }
      },
      { new: true }
    );

    if (!updatedEvent)
      return res.status(400).json({ success: false, message: 'Event is fully booked' });

    res.status(200).json({
      success: true,
      message: 'Successfully registered',
      data: updatedEvent
    });

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

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (!userId)
      return res.status(400).json({ success: false, message: 'User ID is required' });

    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    const registration = event.attendance.registrations.find(
      r => r.user.toString() === userId && r.status !== 'cancelled'
    );

    if (!registration)
      return res.status(404).json({ success: false, message: 'Registration not found' });

    // Atomic update to avoid race condition on currentAttendees decrement
    await Event.updateOne(
      { _id: id, 'attendance.registrations._id': registration._id },
      {
        $set: { 'attendance.registrations.$.status': 'cancelled' },
        $inc: { 'attendance.currentAttendees': -1 }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });

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

    // Only admin or the organizer of this event can view attendees
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.organizer.toString())
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view attendees for this event'
      });

    const attendees = event.attendance.registrations.filter(r => r.status !== 'cancelled');

    res.status(200).json({
      success: true,
      message: 'Attendees retrieved successfully',
      data: attendees
    });

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

    res.status(200).json({
      success: true,
      message: 'Organizer events retrieved successfully',
      data: events
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};