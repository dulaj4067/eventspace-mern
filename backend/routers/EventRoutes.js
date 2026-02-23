const express = require('express');
const router = express.Router();
const eventController = require('../controllers/EventController');

// Organizer events — must be before /:id routes
router.get('/organizer/:organizerId', eventController.getMyEvents);

// CRUD
router.get('/',       eventController.getAllEvents);
router.post('/',      eventController.createEvent);
router.get('/:id',    eventController.getEventById);
router.put('/:id',    eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Status actions
router.patch('/:id/publish', eventController.publishEvent);
router.patch('/:id/cancel',  eventController.cancelEvent);

// Registrations
router.post('/:id/register',            eventController.registerForEvent);
router.post('/:id/cancel-registration', eventController.cancelRegistration);
router.get('/:id/attendees',            eventController.getEventAttendees);

module.exports = router;