import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useBookingsState() {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch bookings from real API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/bookings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setBookings(data.data);
      } catch (error) {
        toast.error(error.message || 'Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) =>
      filterStatus === 'all' || booking.status === filterStatus
    );
  }, [bookings, filterStatus]);

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }), [bookings]);

  const cancelBooking = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Cancelled by user' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Update local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === id ? { ...booking, status: 'cancelled' } : booking
        )
      );
      toast.success('Booking cancelled successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to cancel booking');
    }
  }, []);

  return {
    bookings,
    filteredBookings,
    filterStatus,
    setFilterStatus,
    stats,
    cancelBooking,
    isLoading,
  };
}