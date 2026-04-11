// useBookingCalendarState.jsx
// Fetches all confirmed bookings from the existing GET /api/bookings/calendar endpoint
// Any logged-in user can see all confirmed bookings to plan their reservation

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useBookingCalendarState() {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Current calendar month and year — default to today
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Selected date string (YYYY-MM-DD) — null means nothing selected
    const [selectedDate, setSelectedDate] = useState(null);

    // ✅ Fetch from your existing backend endpoint — no new backend needed
    useEffect(() => {
        const fetchCalendarBookings = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const API_BASE_URL = process.env.REACT_APP_API_URL || '';
                const response = await fetch(`${API_BASE_URL}/api/bookings/calendar`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);

                // Backend returns events with start: "YYYY-MM-DDThh:mm:ss"
                // Extract just the date part (YYYY-MM-DD) for calendar grouping
                const normalized = data.data.map((event) => ({
                    ...event,
                    date: event.start.split('T')[0], // extract YYYY-MM-DD from start
                }));

                setBookings(normalized);
            } catch (error) {
                toast.error(error.message || 'Failed to load calendar');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCalendarBookings();
    }, []);

    // Group bookings by date string (YYYY-MM-DD) for fast calendar lookup
    // e.g. { '2025-07-15': [event1, event2], ... }
    const bookingsByDate = useMemo(() => {
        const map = {};
        for (const booking of bookings) {
            if (!map[booking.date]) map[booking.date] = [];
            map[booking.date].push(booking);
        }
        return map;
    }, [bookings]);

    // Bookings for the currently selected date
    const selectedDateBookings = useMemo(() => {
        if (!selectedDate) return [];
        return bookingsByDate[selectedDate] ?? [];
    }, [selectedDate, bookingsByDate]);

    // Go to previous month
    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((y) => y - 1);
        } else {
            setCurrentMonth((m) => m - 1);
        }
        setSelectedDate(null); // clear selection on month change
    };

    // Go to next month
    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((y) => y + 1);
        } else {
            setCurrentMonth((m) => m + 1);
        }
        setSelectedDate(null); // clear selection on month change
    };

    return {
        isLoading,
        bookingsByDate,
        selectedDate,
        setSelectedDate,
        selectedDateBookings,
        currentMonth,
        currentYear,
        goToPrevMonth,
        goToNextMonth,
    };
}