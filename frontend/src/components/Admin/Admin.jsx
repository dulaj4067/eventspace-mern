import { AdminView } from './AdminView.jsx';
import { useAdminDashboardState } from './useAdminDashboardState.jsx';

export function Admin() {
  const {
    bookings,
    facilities,
    externalCenters,
    loadingExternal,
    loading,
    error,
    approveBooking,
    rejectBooking,
    verifyFacility,
    deleteFacility,
    removeExternalFacility,
    loadExternalCenters,
    confirmedBookingsByFacilityId,
    statusFilter,
    setStatusFilter,
    facilityFilter,
    setFacilityFilter,
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
      externalCenters={externalCenters}
      loadingExternal={loadingExternal}
      onApproveBooking={approveBooking}
      onRejectBooking={rejectBooking}
      onVerifyFacility={verifyFacility}
      onDeleteFacility={deleteFacility}
      onRemoveExternalFacility={removeExternalFacility}
      onLoadExternalCenters={loadExternalCenters}
      confirmedBookingsByFacilityId={confirmedBookingsByFacilityId}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      facilityFilter={facilityFilter}
      onFacilityFilterChange={setFacilityFilter}
    />
  );
}