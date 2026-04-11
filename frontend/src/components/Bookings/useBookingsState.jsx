import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { generateReceiptHTML } from './receiptTemplate.js'; // ✅ ADDED: import receipt template

export function useBookingsState() {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch bookings from real API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
        const response = await fetch(`${API_BASE_URL}/api/bookings/my`, { //fix to get only user own bookings
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
      const token = sessionStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/bookings/${id}/cancel`, {
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

  // ✅ ADDED: downloadReceipt — gets HTML from receiptTemplate.js and triggers browser print-to-PDF.
  // Called from BookingsView when user clicks "Download Receipt" on a confirmed booking.
  const downloadReceipt = useCallback((booking) => {
    const html = generateReceiptHTML(booking); // ✅ ADDED: HTML lives in receiptTemplate.js
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }, []);

  // ✅ ADDED: deleteBooking — permanently removes a cancelled booking from the list.
  // Only available for cancelled bookings. Calls DELETE /api/bookings/:id/cancelled.
  const deleteBooking = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/bookings/${id}/cancelled`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Remove deleted booking from local state immediately
      setBookings((prev) => prev.filter((booking) => booking._id !== id));
      toast.success('Booking deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete booking');
    }
  }, []);

  return {
    bookings,
    filteredBookings,
    filterStatus,
    setFilterStatus,
    stats,
    cancelBooking,
    downloadReceipt, // ✅ ADDED
    deleteBooking,   // ✅ ADDED
    isLoading,
  };
}