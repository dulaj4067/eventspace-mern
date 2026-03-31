import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const API_BASE = '/api';

export function useAdminDashboardState() {
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Status filter state — empty string means "All" (no filter)
  const [statusFilter, setStatusFilter] = useState('');

  // ─── Fetch bookings ──────────────────────────────────────────────────────
  // Extracted into its own function so it can be re-called when statusFilter changes
  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // ✅ Append ?status= only when a filter is selected
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const bookingsRes = await fetch(`${API_BASE}/bookings${query}`, { headers });

      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');

      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.data ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load bookings');
    }
  }, [statusFilter]); // ✅ re-runs whenever statusFilter changes

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

        // ✅ Fetch facilities once on mount (no filter needed)
        const facilitiesRes = await fetch(`${API_BASE}/facilities`, { headers });
        if (!facilitiesRes.ok) throw new Error('Failed to fetch facilities');

        const facilitiesData = await facilitiesRes.json();
        setFacilities(facilitiesData.data ?? []);

        // ✅ Fetch bookings (respects current statusFilter)
        await fetchBookings();
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // runs once on mount

  // ✅ Re-fetch bookings whenever statusFilter changes (skip initial mount)
  const isFirstRender = useMemo(() => ({ current: true }), []);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchBookings();
  }, [statusFilter, fetchBookings]);

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

      // ✅ Optimistically update local state
      // If a status filter is active and this booking no longer matches,
      // remove it from the list. Otherwise just update its status.
      setBookings((prev) =>
        statusFilter && statusFilter !== 'confirmed'
          ? prev.filter((b) => b._id !== id)           // remove from filtered list
          : prev.map((b) => (b._id === id ? { ...b, status: 'confirmed' } : b))
      );
      toast.success('Booking approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve booking');
    }
  }, [statusFilter]);

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

      // ✅ Same smart optimistic update — remove if it no longer matches filter
      setBookings((prev) =>
        statusFilter && statusFilter !== 'cancelled'
          ? prev.filter((b) => b._id !== id)           // remove from filtered list
          : prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
      );
      toast.success('Booking rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject booking');
    }
  }, [statusFilter]);

  // ─── Stats (always computed from ALL loaded bookings) ────────────────────
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
    statusFilter,       // ✅ expose to Admin.jsx
    setStatusFilter,    // ✅ expose to Admin.jsx
  };
}