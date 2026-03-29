import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const API_BASE = '/api';

export function useAdminDashboardState() {
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch bookings & facilities on mount ────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const [bookingsRes, facilitiesRes] = await Promise.all([
          fetch(`${API_BASE}/bookings`, { headers }),
          fetch(`${API_BASE}/facilities`, { headers }),
        ]);

        if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');
        if (!facilitiesRes.ok) throw new Error('Failed to fetch facilities');

        const bookingsData = await bookingsRes.json();
        const facilitiesData = await facilitiesRes.json();

        // Backend returns { success: true, data: [...] }
        setBookings(bookingsData.data ?? []);
        setFacilities(facilitiesData.data ?? []);
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ─── Approve booking ─────────────────────────────────────────────────────
  const approveBooking = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'confirmed', reason: 'Approved by admin' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to approve booking');
      }

      // Optimistically update local state
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'confirmed' } : b))
      );
      toast.success('Booking approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve booking');
    }
  }, []);

  // ─── Reject booking ──────────────────────────────────────────────────────
  const rejectBooking = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled', reason: 'Rejected by admin' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to reject booking');
      }

      // Optimistically update local state
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
      );
      toast.success('Booking rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject booking');
    }
  }, []);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    return {
      totalFacilities: facilities.length,
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      revenue: confirmedBookings.reduce((sum, b) => sum + (b.pricing?.total ?? 0), 0),
    };
  }, [bookings, facilities]);

  // ─── Confirmed bookings count per facility ───────────────────────────────
  const confirmedBookingsByFacilityId = useMemo(() => {
    const counts = new Map();
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue;
      const facilityId = booking.facility?._id ?? booking.facility;
      counts.set(facilityId, (counts.get(facilityId) ?? 0) + 1);
    }
    return counts;
  }, [bookings]);

  return {
    bookings,
    facilities,
    stats,
    loading,
    error,
    approveBooking,
    rejectBooking,
    confirmedBookingsByFacilityId,
  };
}