// BookingCalendar.jsx
// Entry point — connects state hook to view
// Place this file alongside your other booking components

import { BookingCalendarView } from './BookingCalendarView.jsx';
import { useBookingCalendarState } from './useBookingCalendarState.jsx';

export function BookingCalendar() {
    const {
        isLoading,
        bookingsByDate,
        selectedDate,
        setSelectedDate,
        selectedDateBookings,
        currentMonth,
        currentYear,
        goToPrevMonth,
        goToNextMonth,
    } = useBookingCalendarState();

    return (
        <BookingCalendarView
            isLoading={isLoading}
            bookingsByDate={bookingsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedDateBookings={selectedDateBookings}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
        />
    );
}