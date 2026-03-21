const express = require('express');
const router = express.Router();
const eventController = require('../controllers/EventController');
const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');

// Organizer events — must be before /:id routes
router.get('/organizer/:organizerId', verifyToken, eventController.getMyEvents);

// CRUD
router.get('/',       eventController.getAllEvents);
router.post('/',      verifyToken, eventController.createEvent);
router.get('/:id',    eventController.getEventById);
router.put('/:id',    verifyToken, eventController.updateEvent);
router.delete('/:id', verifyToken, isAdmin, eventController.deleteEvent);

// Status actions
router.patch('/:id/publish',      verifyToken, eventController.publishEvent);
router.patch('/:id/cancel',       verifyToken, eventController.cancelEvent);

// Link booking to event
router.patch('/:id/link-booking', verifyToken, async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { bookingId } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { booking: bookingId } },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Booking linked successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Registrations
router.post('/:id/register',            verifyToken, eventController.registerForEvent);
router.post('/:id/cancel-registration', verifyToken, eventController.cancelRegistration);
router.get('/:id/attendees',            verifyToken, eventController.getEventAttendees);

module.exports = router;