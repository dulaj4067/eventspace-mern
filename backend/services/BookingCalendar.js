// services/BookingCalendar.js

const { google } = require('googleapis');
const Booking = require('../models/Booking');

// Parse the private key — handles both escaped \\n and real newlines
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')   // convert escaped newlines
    .trim();                  // remove any leading/trailing whitespace

// Log partial key on startup to confirm it's loading correctly
console.log('[GoogleCalendar] client_email:', process.env.GOOGLE_CLIENT_EMAIL);
console.log('[GoogleCalendar] key starts with:', privateKey.substring(0, 40));
console.log('[GoogleCalendar] key ends with:', privateKey.substring(privateKey.length - 40));
console.log('[GoogleCalendar] calendar_id:', process.env.GOOGLE_CALENDAR_ID);

const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Get all confirmed bookings formatted for calendar display
 */
const getCalendarBookings = async () => {
    const bookings = await Booking.find({ status: 'confirmed' })
        .populate('facility')
        .populate('user');

    const calendarEvents = bookings.map(b => ({
        id: b._id,
        title: `${b.facility.name} - ${b.user.name}`,
        start: `${b.date.toISOString().split('T')[0]}T${b.startTime}:00`,
        end: `${b.date.toISOString().split('T')[0]}T${b.endTime}:00`,
        description: b.purpose,
        facilityId: b.facility._id,
        userId: b.user._id
    }));

    return calendarEvents;
};

/**
 * Push confirmed bookings to Google Calendar
 * - Skips bookings that have already been pushed (googleEventId exists)
 * - Saves googleEventId back to the booking to prevent duplicates
 */
const pushToGoogleCalendar = async () => {

    // Step 1: Verify auth is working before attempting any inserts
    try {
        await auth.authorize();
        console.log('[GoogleCalendar] ✅ Auth successful');
    } catch (authErr) {
        console.error('[GoogleCalendar] ❌ Auth failed:', authErr.message);
        return {
            success: false,
            message: 'Google Calendar authentication failed',
            details: { error: authErr.message }
        };
    }

    // Step 2: Only fetch confirmed bookings not yet pushed
    const bookings = await Booking.find({
        status: 'confirmed',
        $or: [
            { googleEventId: { $exists: false } },
            { googleEventId: null }
        ]
    })
        .populate('facility')
        .populate('user');

    if (bookings.length === 0) {
        return {
            success: true,
            message: 'No new bookings to push to Google Calendar',
            details: { pushed: 0, failed: 0, errors: [] }
        };
    }

    const results = { pushed: 0, failed: 0, errors: [] };

    for (const booking of bookings) {
        const dateStr = booking.date.toISOString().split('T')[0];
        const eventStart = `${dateStr}T${booking.startTime}:00`;
        const eventEnd = `${dateStr}T${booking.endTime}:00`;
        const eventTitle = `${booking.facility.name} - ${booking.user.name}`;

        try {
            const response = await calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: {
                    summary: eventTitle,
                    description: booking.purpose || '',
                    start: {
                        dateTime: eventStart,
                        timeZone: 'Asia/Colombo'
                    },
                    end: {
                        dateTime: eventEnd,
                        timeZone: 'Asia/Colombo'
                    }
                }
            });

            // Save Google Event ID to prevent duplicate pushes
            await Booking.findByIdAndUpdate(booking._id, {
                googleEventId: response.data.id
            });

            console.log(`✅ Pushed: ${eventTitle} → ${response.data.htmlLink}`);
            results.pushed++;

        } catch (err) {
            console.error(`❌ Failed to push "${eventTitle}":`, err.message);
            results.failed++;
            results.errors.push({
                bookingId: booking._id,
                event: eventTitle,
                error: err.message
            });
        }
    }

    return {
        success: results.failed === 0,
        message: `Pushed: ${results.pushed}, Failed: ${results.failed}`,
        details: results
    };
};

module.exports = {
    getCalendarBookings,
    pushToGoogleCalendar
};