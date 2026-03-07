// services/BookingCalendar.js

const { google } = require('googleapis');
const Booking = require('../models/Booking');

const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim();

const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * GET /api/bookings/calendar
 * Returns confirmed bookings showing only facility, date and times
 * Used by users to see what slots are already taken before creating an event
 */
const getCalendarBookings = async () => {
    const bookings = await Booking.find({ status: 'confirmed' })
        .populate('facility', 'name location'); // only get name and location from facility

    return bookings.map(b => ({
        facilityName: b.facility.name,
        facilityLocation: b.facility.location,
        date: b.date.toISOString().split('T')[0],  // YYYY-MM-DD
        startTime: b.startTime,
        endTime: b.endTime,
        duration: b.duration
    }));
};

/**
 * Push a single booking to Google Calendar
 * Called automatically when a booking is confirmed
 * Saves the googleEventId back to the booking record
 */
const pushBookingToGoogleCalendar = async (booking) => {
    // Populate facility and user if not already populated
    if (!booking.facility.name) {
        booking = await Booking.findById(booking._id)
            .populate('facility')
            .populate('user');
    }

    const dateStr = booking.date.toISOString().split('T')[0];
    const eventTitle = `${booking.facility.name} - Booked`;

    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: {
            summary: eventTitle,
            description: `Facility: ${booking.facility.name}\nDate: ${dateStr}\nTime: ${booking.startTime} - ${booking.endTime}\nPurpose: ${booking.purpose || ''}`,
            start: {
                dateTime: `${dateStr}T${booking.startTime}:00`,
                timeZone: 'Asia/Colombo'
            },
            end: {
                dateTime: `${dateStr}T${booking.endTime}:00`,
                timeZone: 'Asia/Colombo'
            }
        }
    });

    // Save Google Event ID to the booking to track it
    await Booking.findByIdAndUpdate(booking._id, {
        googleEventId: response.data.id
    });

    console.log(`✅ Google Calendar event created: ${response.data.htmlLink}`);
    return response.data.id;
};

module.exports = {
    getCalendarBookings,
    pushBookingToGoogleCalendar
};