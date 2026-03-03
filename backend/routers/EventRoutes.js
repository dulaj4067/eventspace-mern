const express = require('express');
const router = express.Router();
const eventController = require('../controllers/EventController');
const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');

// Organizer events — must be before /:id routes
router.get('/organizer/:organizerId', verifyToken, eventController.getMyEvents);

// CRUD
router.get('/',       eventController.getAllEvents);         // public
router.post('/',      verifyToken, eventController.createEvent);
router.get('/:id',    eventController.getEventById);        // public
router.put('/:id',    verifyToken, eventController.updateEvent);
router.delete('/:id', verifyToken, isAdmin, eventController.deleteEvent);

// Status actions
router.patch('/:id/publish', verifyToken, eventController.publishEvent);
router.patch('/:id/cancel',  verifyToken, eventController.cancelEvent);

// Registrations
router.post('/:id/register',            verifyToken, eventController.registerForEvent);
router.post('/:id/cancel-registration', verifyToken, eventController.cancelRegistration);
router.get('/:id/attendees',            verifyToken, eventController.getEventAttendees);

module.exports = router;