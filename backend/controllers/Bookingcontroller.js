// Bookingcontroller.js

// This controller handles all booking-related operations:
// - Create bookings
// - Get bookings (all or per user)
// - Update bookings
// - Cancel bookings
// - Admin approval/rejection


const Booking = require('../models/Booking');
const User = require('../models/User');
const Facility = require('../models/Facilities');
const { getCalendarBookings, pushToGoogleCalendar } = require('../services/BookingCalendar');

// 1. CREATE BOOKING

const createBooking = async (req, res) => {
    try {
        const {
            facility,
            event,
            date,
            startTime,
            endTime,
            purpose,
            attendees,
            pricing,
            specialRequests
        } = req.body;

        //   use authenticated user from JWT
        const user = req.user.id;



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


        //  Validate facility working hours

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

const getBookings = async (req, res) => {
    try {
        const { userId } = req.query;

        let bookings;
        if (userId) {
            bookings = await Booking.find({ user: userId })
                .populate('user')
                .populate('facility');
        } else {
            bookings = await Booking.find()
                .populate('user')
                .populate('facility');
        }

        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 3. UPDATE BOOKING STATUS

const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, reason } = req.body;

        //  Use authenticated admin ID for status change tracking
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
        // ✅ Add this block
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


// 4. CANCEL BOOKING

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });


        //  Ownership check (user must own booking or be admin)
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

        //  Use authenticated user as canceller
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

// 5. DELETE BOOKING (Admin only)

const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        await Booking.findByIdAndDelete(bookingId);

        res.status(200).json({ success: true, message: 'Booking deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Helper Functions

const calculateDuration = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    return (endH + endM/60) - (startH + startM/60);
};

const calculateRefund = (booking) => {
    return booking.pricing.total;
};

// GET /api/bookings/calendar
const getBookingCalendar = async (req, res) => {
    try {
        const events = await getCalendarBookings();
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//temporary test booking calendar
/*const { pushToGoogleCalendar } = require('../services/BookingCalendar');

const pushGoogleCalendar = async (req, res) => {
    try {
        const result = await pushToGoogleCalendar();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};*/


module.exports = {
    createBooking,
    getBookings,
    updateBookingStatus,
    cancelBooking,
    deleteBooking
    getBookingCalendar,
    deleteBooking
    //pushGoogleCalendar temporaly for testing google calender
};