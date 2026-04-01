import { BookingsView } from './BookingsView.jsx';
import { useBookingsState } from './useBookingsState.jsx';

export function Bookings() {
  const { filteredBookings, filterStatus, setFilterStatus, stats, cancelBooking, downloadReceipt, isLoading } =
    useBookingsState();

  return (
    <BookingsView
      filteredBookings={filteredBookings}
      filterStatus={filterStatus}
      onFilterStatusChange={setFilterStatus}
      stats={stats}
      onCancelBooking={cancelBooking}
      onDownloadReceipt={downloadReceipt} // receipt download handler
      isLoading={isLoading}
    />
  );
}