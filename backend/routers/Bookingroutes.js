// Bookingroutes.js

// Routes for all booking-related operations
// - Create a booking
// - Get bookings (all or filtered by user, date, status, facility)
// - Update booking status (admin approval/rejection)
// - Cancel bookings (user or admin)


const express = require('express');
const router = express.Router();

// CONTROLLER IMPORTS
const {
    createBooking,
    getBookings,
    updateBookingStatus,
    cancelBooking,
    getBookingCalendar,
    deleteBooking
   // pushGoogleCalendar temporaly for booking calnder testing
} = require('../controllers/Bookingcontroller');

// MIDDLEWARE IMPORTS
const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');


// ROUTES

// 1. CREATE BOOKING - Accessible by authenticated users

// POST /api/bookings
router.post(
    '/',
    verifyToken,        // Must be logged in
    createBooking
);


// 2. GET BOOKINGS - Accessible by authenticated users

// GET /api/bookings
router.get(
    '/',
    verifyToken,
    getBookings
);


// 3. UPDATE BOOKING STATUS - Admin only - approve, reject, complete bookings

// PATCH /api/bookings/:bookingId/status
router.patch(
    '/:bookingId/status',
    verifyToken,
    isAdmin,            // Only admins can change status
    updateBookingStatus
);


// 4. CANCEL BOOKING - Accessible by user who booked or admin

// PATCH /api/bookings/:bookingId/cancel
router.patch(
    '/:bookingId/cancel',
    verifyToken,
    cancelBooking        // Controller should check if user owns booking or is admin
);

// 5. DELETE BOOKING - Admin only
// DELETE /api/bookings/:bookingId
router.delete(
    '/:bookingId',
    verifyToken,
    isAdmin,        // Only admins can delete
    deleteBooking
);

// GET /api/bookings/calendar - Accessible by authenticated users
router.get(
    '/calendar',
    verifyToken,
    getBookingCalendar
);



// EXPORT ROUTER
module.exports = router;
