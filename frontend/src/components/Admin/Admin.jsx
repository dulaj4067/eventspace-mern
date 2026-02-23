import { mockBookings, facilities } from '../../data/mockData.js';
import { AdminView } from './AdminView.jsx';
import { useAdminDashboardState } from './useAdminDashboardState.jsx';

export function Admin() {
  const { bookings, stats, approveBooking, rejectBooking, confirmedBookingsByFacilityId } =
    useAdminDashboardState({ initialBookings: mockBookings, facilities });

  return (
    <AdminView
      bookings={bookings}
      facilities={facilities}
      stats={stats}
      onApproveBooking={approveBooking}
      onRejectBooking={rejectBooking}
      confirmedBookingsByFacilityId={confirmedBookingsByFacilityId}
    />
  );
}
