import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useAdminDashboardState({ initialBookings, facilities }) {
  const [bookings, setBookings] = useState(initialBookings);

  const approveBooking = useCallback((id) => {
    setBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, status: 'confirmed' } : booking))
    );
    toast.success('Booking approved successfully');
  }, []);

  const rejectBooking = useCallback((id) => {
    setBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking))
    );
    toast.success('Booking rejected');
  }, []);

  const stats = useMemo(() => {
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    return {
      totalFacilities: facilities.length,
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      revenue: confirmedBookings.reduce((sum, b) => sum + b.totalCost, 0),
    };
  }, [bookings, facilities.length]);

  const confirmedBookingsByFacilityId = useMemo(() => {
    const counts = new Map();
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue;
      counts.set(booking.facilityId, (counts.get(booking.facilityId) ?? 0) + 1);
    }
    return counts;
  }, [bookings]);

  return {
    bookings,
    stats,
    approveBooking,
    rejectBooking,
    confirmedBookingsByFacilityId,
  };
}

