import { BookingsView } from './BookingsView.jsx';
import { useBookingsState } from './useBookingsState.jsx';

export function Bookings() {
  const { filteredBookings, filterStatus, setFilterStatus, stats, cancelBooking, isLoading } =
    useBookingsState();

  return (
    <BookingsView
      filteredBookings={filteredBookings}
      filterStatus={filterStatus}
      onFilterStatusChange={setFilterStatus}
      stats={stats}
      onCancelBooking={cancelBooking}
      isLoading={isLoading}
    />
  );
}