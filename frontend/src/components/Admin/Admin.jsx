import { AdminView } from './AdminView.jsx';
import { useAdminDashboardState } from './useAdminDashboardState.jsx';

export function Admin() {
  const {
    bookings,
    facilities,
    stats,
    loading,
    error,
    approveBooking,
    rejectBooking,
    confirmedBookingsByFacilityId,
    statusFilter,        // ✅
    setStatusFilter,     // ✅
  } = useAdminDashboardState();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <AdminView
      bookings={bookings}
      facilities={facilities}
      stats={stats}
      onApproveBooking={approveBooking}
      onRejectBooking={rejectBooking}
      confirmedBookingsByFacilityId={confirmedBookingsByFacilityId}
      statusFilter={statusFilter}            // ✅
      onStatusFilterChange={setStatusFilter} // ✅
    />
  );
}