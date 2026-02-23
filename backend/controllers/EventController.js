const Event = require('../models/Event');

/**
 * @route   POST /api/events
 * @access  Public
 */
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, message: 'Event created successfully', data: event });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/events
 * @access  Public
 * @query   page, limit, status, type, visibility, search, tag, startDate, endDate, isFree, sortBy, sortOrder
 */
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
    if (status)     filter.status = status;
    if (type)       filter.type = type;
    if (visibility) filter.visibility = visibility;
    if (tag)        filter.tags = tag.toLowerCase();
    if (isFree !== undefined) filter['pricing.isFree'] = isFree === 'true';

    if (startDate || endDate) {
      filter['schedule.date'] = {};
      if (startDate) filter['schedule.date'].$gte = new Date(startDate);
      if (endDate)   filter['schedule.date'].$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location:    { $regex: search, $options: 'i' } },
        { tags:        { $regex: search, $options: 'i' } }
      ];
    }

    const skip    = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name email')
        .populate('facility', 'name location')
        .populate('booking')
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
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/events/:id
 * @access  Public
 */
exports.getEventById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('facility', 'name location')
      .populate('booking')
      .populate('attendance.registrations.user', 'name email');

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Increment view count
    await Event.findByIdAndUpdate(req.params.id, { $inc: { 'metrics.views': 1 } });

    res.status(200).json({ success: true, message: 'Event retrieved successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/events/:id
 * @access  Public
 */
exports.updateEvent = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('organizer', 'name email')
      .populate('facility', 'name location');

    res.status(200).json({ success: true, message: 'Event updated successfully', data: updated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/events/:id
 * @access  Public
 */
exports.deleteEvent = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PATCH /api/events/:id/publish
 * @access  Public
 */
exports.publishEvent = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.status === 'published') {
      return res.status(400).json({ success: false, message: 'Event is already published' });
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Event published successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PATCH /api/events/:id/cancel
 * @access  Public
 */
exports.cancelEvent = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Event is already cancelled' });
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Event cancelled successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/events/:id/register
 * @access  Public
 */
exports.registerForEvent = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'published') return res.status(400).json({ success: false, message: 'Event is not open for registration' });
    if (event.attendance.currentAttendees >= event.attendance.maxAttendees) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    const alreadyRegistered = event.attendance.registrations.some(
      r => r.user.toString() === userId && r.status !== 'cancelled'
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'User is already registered for this event' });
    }

    event.attendance.registrations.push({
      user: userId,
      status: 'registered',
      paymentStatus: event.pricing.isFree ? 'not-required' : 'pending'
    });
    event.attendance.currentAttendees += 1;
    await event.save();

    res.status(200).json({ success: true, message: 'Successfully registered for event', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/events/:id/cancel-registration
 * @access  Public
 */
exports.cancelRegistration = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const registration = event.attendance.registrations.find(
      r => r.user.toString() === userId && r.status !== 'cancelled'
    );
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    registration.status = 'cancelled';
    event.attendance.currentAttendees = Math.max(0, event.attendance.currentAttendees - 1);
    await event.save();

    res.status(200).json({ success: true, message: 'Registration cancelled successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/events/organizer/:organizerId
 * @access  Public
 */
exports.getMyEvents = async (req, res) => {
  try {
    const { organizerId } = req.params;
    if (!organizerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid organizer ID format' });
    }

    const events = await Event.find({ organizer: organizerId })
      .populate('facility', 'name location')
      .sort({ 'schedule.date': -1 });

    res.status(200).json({ success: true, message: 'Organizer events retrieved', data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/events/:id/attendees
 * @access  Public
 */
exports.getEventAttendees = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const event = await Event.findById(req.params.id)
      .populate('attendance.registrations.user', 'name email');

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const attendees = event.attendance.registrations.filter(r => r.status !== 'cancelled');

    res.status(200).json({ success: true, message: 'Attendees retrieved successfully', data: attendees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
