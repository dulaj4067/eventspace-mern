// Bookingcontroller.js

// This controller handles all booking-related operations:
// - Create bookings
// - Get bookings (all or per user)
// - Update bookings
// - Cancel bookings
// - Admin approval/rejection


const Booking = require('../models/Booking');
const User = require('../models/User');

// 1. CREATE BOOKING

const createBooking = async (req, res) => {
    try {
        const {
            user,
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

         //*********/
        // TODO: Check if facility is already booked for this date/time
        // TODO: Validate facility working hours

        // Create booking object
        const newBooking = new Booking({
            user,
            facility,
            event,
            date,
            startTime,
            endTime,
            duration: calculateDuration(startTime, endTime), // helper function
            purpose,
            attendees,
            status: 'pending', // default status
            pricing,
            specialRequests
        });

        // Save booking to database
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

// Fetch all bookings or user-specific bookings
const getBookings = async (req, res) => {
    try {
        const { userId } = req.query; // optional filter by user

        let bookings;
        if (userId) {
            bookings = await Booking.find({ user: userId })
                .populate('user')
                .populate('facility')
                .populate('event');
        } else {
            bookings = await Booking.find()
                .populate('user')
                .populate('facility')
                .populate('event');
        }

        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 3. UPDATE BOOKING STATUS

// Change booking status (e.g., admin approval/rejection)
const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, reason, changedBy } = req.body;

        // Find booking
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Update status
        booking.status = status;

        // Update status history
        booking.statusHistory.push({
            status,
            changedAt: new Date(),
            changedBy,
            reason
        });

        const updatedBooking = await booking.save();
        res.status(200).json({ success: true, message: 'Booking status updated', data: updatedBooking });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 4. CANCEL BOOKING

// User can cancel booking before start time
const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { cancelledBy, reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        //*********/
        // TODO: Check if cancellation is allowed (before startTime) ****

        // Update cancellation info
        booking.cancellation = {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy,
            reason,
            refundAmount: calculateRefund(booking) // optional helper function
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


// Helper Functions

// Calculate duration in hours from start and end time
const calculateDuration = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    return (endH + endM/60) - (startH + startM/60);
};

// Placeholder for refund calculation
const calculateRefund = (booking) => {
    // Example: full refund if cancelled 24h before start
    return booking.pricing.total;
};


// Export all controller functions
module.exports = {
    createBooking,
    getBookings,
    updateBookingStatus,
    cancelBooking
};
