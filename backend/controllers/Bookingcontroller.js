// Bookingcontroller.js

// This controller handles all booking-related operations:
// - Create bookings
// - Get bookings (all or per user)
// - Get my bookings (always returns only logged-in user's bookings)
// - Update bookings
// - Cancel bookings
// - Admin approval/rejection


const Booking = require('../models/Booking');
const User = require('../models/User');
const Facility = require('../models/Facilities');
const { getCalendarBookings, pushToGoogleCalendar } = require('../services/BookingCalendar');
const { normalizeTime } = require('../utils/timeUtils');

// 1. CREATE BOOKING

const createBooking = async (req, res) => {
    try {
        let {
            facility,
            event,
            date,
            startTime,
            endTime,
            purpose,
            attendees,
            pricing,
            specialRequests,
            externalFacilityData
        } = req.body;

        // Normalize times
        startTime = normalizeTime(startTime) || startTime;
        endTime = normalizeTime(endTime) || endTime;

        // Use authenticated user from JWT
        const user = req.user.id;

        // If it's an external facility ID (e.g. "community-123"),
        // check if it's already in our DB or create it.
        if (typeof facility === 'string' && (facility.startsWith('community-') || facility.startsWith('external-'))) {
            let existingFacility = await Facility.findOne({ externalId: facility });
            
            if (!existingFacility) {
                if (!externalFacilityData) {
                     return res.status(400).json({ 
                        success: false, 
                        message: 'External facility data is required to book this location for the first time.' 
                    });
                }
                
                // Create a facility record for this external location
                const newFacility = new Facility({
                    ...externalFacilityData,
                    externalId: facility,
                    isExternal: true,
                    verified: true, // Auto-verify real world locations
                    isActive: true
                });
                existingFacility = await newFacility.save();
            }
            // Use the database _id for the booking
            facility = existingFacility._id;
        }

        // Check if facility is already booked for this date/time
        const overlappingBooking = await Booking.findOne({
            facility,
            date: new Date(date),
            status: { $in: ['pending', 'confirmed'] },
            $or: [
                {
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime }
                }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({
                success: false,
                message: 'Facility is already booked for the selected date and time.'
            });
        }

        // Validate facility working hours
        const facilityData = await Facility.findById(facility);
        if (!facilityData) {
            return res.status(404).json({ success: false, message: 'Facility not found' });
        }

        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const day = dayNames[new Date(date).getDay()];
        const schedule = facilityData.availability.schedule[day];

        if (!schedule.isOpen || startTime < schedule.openTime || endTime > schedule.closeTime) {
            return res.status(400).json({
                success: false,
                message: `Booking time is outside facility working hours (${schedule.openTime} - ${schedule.closeTime})`
            });
        }

        const newBooking = new Booking({
            user,
            facility,
            event,
            date,
            startTime,
            endTime,
            duration: calculateDuration(startTime, endTime),
            purpose,
            attendees,
            status: 'pending',
            pricing,
            specialRequests
        });

        const savedBooking = await newBooking.save();

        // ─── LINK TO EVENT ──────────────────────────────────────────
        // If this booking is for an event, update the Event document
        if (event) {
            const Event = require('../models/Event');
            await Event.findByIdAndUpdate(event, { booking: savedBooking._id });
        }
        // ─────────────────────────────────────────────────────────────

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: savedBooking
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 2. GET BOOKINGS
// - Regular users only see their own bookings
// - Admins can see all bookings
// ✅ FIXED: Admin can now filter bookings by status using ?status= query param
//           Example: GET /api/bookings?status=pending
//           If no ?status= is provided, all bookings are returned (no change in behaviour)
// ⚠️  Do NOT use this endpoint for "My Bookings" page
//     because admins will get all bookings instead of their own.
//     Use getMyBookings (endpoint: GET /api/bookings/my) instead.

const getBookings = async (req, res) => {
    try {
        const requestingUser = req.user; // injected by auth middleware from JWT

        let bookings;

        if (requestingUser.role === 'admin') {

            // ✅ FIXED: Build a filter object instead of calling Booking.find() with no filter
            // This allows optional status filtering via ?status= query param
            const filter = {};

            // ✅ FIXED: If ?status= query param exists and is a valid status value, add it to filter
            // Whitelist check prevents invalid/malicious values reaching the database
            const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
            if (req.query.status && allowedStatuses.includes(req.query.status)) {
                filter.status = req.query.status;
            }
            // If no ?status= param provided, filter stays {} → returns all bookings (original behaviour)

            // Admins see all bookings (or filtered by status) — used for Admin Dashboard
            bookings = await Booking.find(filter)
                .populate('user', 'name email')
                .populate('facility', 'name location')
                .sort({ createdAt: -1 });

        } else {
            // Regular users only see their own bookings (status filter does not apply here)
            bookings = await Booking.find({ user: requestingUser.id })
                .populate('facility', 'name location')
                .sort({ createdAt: -1 });
        }

        res.status(200).json({ success: true, data: bookings });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ NEW — 3. GET MY BOOKINGS
// Always returns only the logged-in user's own bookings regardless of role.
// Used for the "My Bookings" page so admins also see only their own bookings.
// Endpoint: GET /api/bookings/my

const getMyBookings = async (req, res) => {
    try {
        // Always filter by the logged-in user's ID — role does not matter here
        const bookings = await Booking.find({ user: req.user.id })
            .populate('facility', 'name location')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: bookings });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 4. UPDATE BOOKING STATUS

const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, reason } = req.body;

        // Use authenticated admin ID for status change tracking
        const changedBy = req.user.id;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.status = status;

        booking.statusHistory.push({
            status,
            changedAt: new Date(),
            changedBy,
            reason
        });

        const updatedBooking = await booking.save();

        if (status === 'confirmed') {
            try {
                const result = await pushToGoogleCalendar();
                console.log(`✅ Google Calendar sync result:`, result.message);
            } catch (calendarErr) {
                console.error(`⚠️ Google Calendar sync failed: ${calendarErr.message}`);
            }
        }

        res.status(200).json({ success: true, message: 'Booking status updated', data: updatedBooking });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 5. CANCEL BOOKING

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Ownership check (user must own booking or be admin)
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only cancel your own booking.'
            });
        }

        const bookingStart = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}:00`);

        if (new Date() > bookingStart) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel booking after it has started.'
            });
        }

        // Use authenticated user as canceller
        const cancelledBy = req.user.id;

        booking.cancellation = {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy,
            reason,
            refundAmount: calculateRefund(booking)
        };

        booking.status = 'cancelled';
        booking.statusHistory.push({
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: cancelledBy,
            reason
        });

        const cancelledBooking = await booking.save();
        res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: cancelledBooking });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 6. DELETE BOOKING
// ✅ UPDATED: Users can delete their own cancelled bookings.
//             Admins can delete any booking regardless of status.

const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // ✅ ADDED: If the requester is a regular user, enforce ownership + cancelled-only rules
        if (req.user.role !== 'admin') {
            // Users can only delete their own bookings
            if (booking.user.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own bookings.'
                });
            }
            // Users can only delete cancelled bookings
            if (booking.status !== 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'You can only delete cancelled bookings.'
                });
            }
        }

        await Booking.findByIdAndDelete(bookingId);

        res.status(200).json({ success: true, message: 'Booking deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 7. GET BOOKING CALENDAR

const getBookingCalendar = async (req, res) => {
    try {
        const events = await getCalendarBookings();
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ── Helper Functions ──────────────────────────────────────────────────────────

const calculateDuration = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    return (endH + endM / 60) - (startH + startM / 60);
};

const calculateRefund = (booking) => {
    return booking.pricing.total;
};


// ── EXPORTS ───────────────────────────────────────────────────────────────────
module.exports = {
    createBooking,
    getBookings,
    getMyBookings,      // ✅ newly added
    updateBookingStatus,
    cancelBooking,
    deleteBooking,
    getBookingCalendar,
};