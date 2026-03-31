// BookingCalendarView.jsx
// Public calendar UI — shows all confirmed bookings
// Any logged-in user can see which dates are booked and which are free

import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Link } from 'react-router';

// Month names for header display
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];

// Day names for calendar column headers
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Helper: build calendar day grid for a given month ────────────────────────
// Returns array where null = empty cell before month starts, number = day
function buildCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);   // empty leading cells
    for (let d = 1; d <= daysInMonth; d++) days.push(d);  // actual days
    return days;
}

export function BookingCalendarView({
    isLoading,
    bookingsByDate,
    selectedDate,
    onSelectDate,
    selectedDateBookings,
    currentMonth,
    currentYear,
    onPrevMonth,
    onNextMonth,
}) {
    const calendarDays = buildCalendarDays(currentYear, currentMonth);
    const today = new Date().toISOString().split('T')[0];

    // Format a day number to YYYY-MM-DD
    const formatDate = (year, month, day) => {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    };

    // Extract HH:MM from full datetime string "YYYY-MM-DDThh:mm:ss"
    const formatTime = (dateTimeStr) => dateTimeStr?.split('T')[1]?.slice(0, 5) ?? '';

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Page Header ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-4xl mb-2">Booking Calendar</h1>
                    <p className="text-blue-100">
                        See all confirmed bookings — pick a free date to make your reservation
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ── Calendar Grid ─────────────────────────────────── */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>

                                {/* Month navigation */}
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={onPrevMonth}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-xl">
                                        {MONTH_NAMES[currentMonth]} {currentYear}
                                    </h2>
                                    <button
                                        onClick={onNextMonth}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                        <span>Has bookings</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-green-400" />
                                        <span>Available</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                                        <span>Selected</span>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {isLoading ? (
                                    <p className="text-center text-gray-500 py-12">
                                        Loading calendar...
                                    </p>
                                ) : (
                                    <>
                                        {/* Day name headers */}
                                        <div className="grid grid-cols-7 mb-1">
                                            {DAY_NAMES.map((d) => (
                                                <div
                                                    key={d}
                                                    className="text-center text-xs text-gray-500 py-2 font-medium"
                                                >
                                                    {d}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Day cells */}
                                        <div className="grid grid-cols-7 gap-1">
                                            {calendarDays.map((day, idx) => {
                                                // Empty leading cell
                                                if (!day) return <div key={`empty-${idx}`} />;

                                                const dateStr = formatDate(currentYear, currentMonth, day);
                                                const hasBookings = !!bookingsByDate[dateStr];
                                                const isSelected = selectedDate === dateStr;
                                                const isToday = dateStr === today;
                                                const isPast = dateStr < today;

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() =>
                                                            // Toggle selection — click again to deselect
                                                            onSelectDate(isSelected ? null : dateStr)
                                                        }
                                                        disabled={isPast}
                                                        className={`
                                                            relative aspect-square flex flex-col items-center
                                                            justify-center rounded-lg text-sm transition-colors p-1
                                                            ${isSelected
                                                                ? 'bg-purple-600 text-white'
                                                                : hasBookings
                                                                    ? 'bg-red-50 hover:bg-red-100 text-gray-800'
                                                                    : isPast
                                                                        ? 'text-gray-300 cursor-not-allowed'
                                                                        : 'hover:bg-green-50 text-gray-800'
                                                            }
                                                            ${isToday && !isSelected
                                                                ? 'ring-2 ring-purple-400'
                                                                : ''
                                                            }
                                                        `}
                                                    >
                                                        <span>{day}</span>

                                                        {/* Red dot for days that have bookings */}
                                                        {hasBookings && (
                                                            <div className={`
                                                                w-1.5 h-1.5 rounded-full mt-0.5
                                                                ${isSelected ? 'bg-white' : 'bg-red-400'}
                                                            `} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Selected Date Panel ───────────────────────────── */}
                    <div>
                        <Card className="sticky top-4">
                            <CardHeader>
                                <h3 className="text-lg">
                                    {selectedDate
                                        ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                          })
                                        : 'Select a date'
                                    }
                                </h3>
                            </CardHeader>

                            <CardContent>
                                {/* No date selected yet */}
                                {!selectedDate && (
                                    <div className="text-center py-8 text-gray-400">
                                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">
                                            Click any date on the calendar to see its bookings
                                        </p>
                                    </div>
                                )}

                                {/* Date selected — no bookings on that day */}
                                {selectedDate && selectedDateBookings.length === 0 && (
                                    <div className="text-center py-8">
                                        <Calendar className="w-10 h-10 mx-auto mb-3 text-green-400" />
                                        <p className="text-sm text-green-600 mb-4">
                                            No bookings on this date — it's available!
                                        </p>
                                        <Link to="/facilities">
                                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                                                Book a Facility
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {/* Date selected — show bookings */}
                                {selectedDate && selectedDateBookings.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-500">
                                            {selectedDateBookings.length} confirmed booking(s)
                                        </p>

                                        {selectedDateBookings.map((booking) => (
                                            <div
                                                key={booking.id}
                                                className="border rounded-lg p-3 bg-gray-50"
                                            >
                                                {/* Facility name */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                                                    <span className="text-sm font-medium">
                                                        {/* ✅ title from your existing getCalendarBookings format */}
                                                        {booking.title}
                                                    </span>
                                                </div>

                                                {/* Time slot */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                                    <span className="text-sm text-gray-600">
                                                        {/* ✅ start/end from your existing format */}
                                                        {formatTime(booking.start)} - {formatTime(booking.end)}
                                                    </span>
                                                </div>

                                                {/* Purpose / description */}
                                                {booking.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2">
                                                        {booking.description}
                                                    </p>
                                                )}

                                                <Badge className="mt-2 bg-green-100 text-green-700 text-xs">
                                                    Confirmed
                                                </Badge>
                                            </div>
                                        ))}

                                        {/* CTA to book another slot */}
                                        <Link to="/facilities">
                                            <Button className="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                                                Book a Different Time
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}