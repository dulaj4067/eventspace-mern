import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useBookingsState(initialBookings) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => filterStatus === 'all' || booking.status === filterStatus);
  }, [bookings, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
  }, [bookings]);

  const cancelBooking = useCallback((id) => {
    setBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking))
    );
    toast.success('Booking cancelled successfully');
  }, []);

  return {
    bookings,
    filteredBookings,
    filterStatus,
    setFilterStatus,
    stats,
    cancelBooking,
  };
}

