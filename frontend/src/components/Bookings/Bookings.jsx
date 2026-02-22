import { mockBookings } from '../../data/mockData.js';
import { BookingsView } from './BookingsView.jsx';
import { useBookingsState } from './useBookingsState.jsx';

export function Bookings() {
  const { filteredBookings, filterStatus, setFilterStatus, stats, cancelBooking } =
    useBookingsState(mockBookings);

  return (
    <BookingsView
      filteredBookings={filteredBookings}
      filterStatus={filterStatus}
      onFilterStatusChange={setFilterStatus}
      stats={stats}
      onCancelBooking={cancelBooking}
    />
  );
}
