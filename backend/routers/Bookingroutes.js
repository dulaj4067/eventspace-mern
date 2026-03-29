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
    getMyBookings,          // ✅ newly added
    updateBookingStatus,
    cancelBooking,
    deleteBooking,
    getBookingCalendar,
} = require('../controllers/Bookingcontroller');

// MIDDLEWARE IMPORTS
const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');


// ROUTES

// 1. CREATE BOOKING - Accessible by authenticated users
// POST /api/bookings
router.post(
    '/',
    verifyToken,
    createBooking
);


// 2. GET BOOKINGS - Accessible by authenticated users
// GET /api/bookings
router.get(
    '/',
    verifyToken,
    getBookings
);

//✅ NEW — 3. GET MY BOOKINGS — always returns only the logged-in user's bookings
router.get(
    '/my',
    verifyToken,
    getMyBookings
);


// 3. GET BOOKING CALENDAR - Accessible by authenticated users
// GET /api/bookings/calendar
// ⚠️ Must be BEFORE /:bookingId routes to avoid "calendar" being treated as an ID
router.get(
    '/calendar',
    verifyToken,
    getBookingCalendar
);


// 4. UPDATE BOOKING STATUS - Admin only - approve, reject, complete bookings
// PATCH /api/bookings/:bookingId/status
router.patch(
    '/:bookingId/status',
    verifyToken,
    isAdmin,
    updateBookingStatus
);


// 5. CANCEL BOOKING - Accessible by user who booked or admin
// PATCH /api/bookings/:bookingId/cancel
router.patch(
    '/:bookingId/cancel',
    verifyToken,
    cancelBooking
);


// 6. DELETE BOOKING - Admin only
// DELETE /api/bookings/:bookingId
router.delete(
    '/:bookingId',
    verifyToken,
    isAdmin,
    deleteBooking
);


// EXPORT ROUTER
module.exports = router;