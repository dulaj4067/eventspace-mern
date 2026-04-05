import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.jsx';
import { getBookingStatusClassName, getBookingStatusLabel } from '../common/bookingStatus.jsx';
import { AdminFacilitiesTab } from './AdminFacilitiesTab.jsx';
import { AdminPaymentsTab } from './AdminPaymentsTab.jsx';
import { useAdminPaymentsState } from './useAdminPaymentsState.jsx';
import { RevenueTrackingTab } from './RevenueTrackingTab.jsx';

// ✅ Filter options — value '' means show all (no filter sent to backend)
const STATUS_FILTERS = [
  { label: 'All',       value: ''          },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Completed', value: 'completed' },
  { label: 'No-Show',   value: 'no-show'   },
];

export function AdminView({
  bookings,
  facilities,
  externalCenters,
  loadingExternal,
  onApproveBooking,
  onRejectBooking,
  onDeleteBooking,         // ✅ ADDED: delete handler prop
  onVerifyFacility,
  onDeleteFacility,
  onRemoveExternalFacility,
  onLoadExternalCenters,
  confirmedBookingsByFacilityId,
  statusFilter,
  onStatusFilterChange,
  facilityFilter,
  onFacilityFilterChange,
}) {
  const { payments, loading, updateStatus, processPayment, deletePayment } = useAdminPaymentsState();
  const [dashTab, setDashTab] = useState('bookings');

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-800 via-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl mb-2">Admin Dashboard</h1>
          <p className="text-slate-300">Manage facilities and bookings</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          value={dashTab}
          onValueChange={(v) => {
            setDashTab(v);
            if (v === 'facilities') onLoadExternalCenters?.();
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Tracking</TabsTrigger>
          </TabsList>

          {/* ── Bookings Tab ─────────────────────────────────────────────── */}
          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <h2 className="text-2xl">All Bookings</h2>
                <p className="text-gray-600">Review and manage booking requests</p>

                {/* ✅ STATUS FILTER BUTTONS */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => onStatusFilterChange(filter.value)}
                      className={`px-4 py-1.5 rounded-full text-sm border transition-colors
                        ${statusFilter === filter.value
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* ✅ Empty state message reflects current filter */}
                  {bookings.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      {statusFilter
                        ? `No ${statusFilter} bookings found.`
                        : 'No bookings found.'}
                    </p>
                  )}

                  {bookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg mb-1">
                                {booking.facility?.name ?? 'Unknown Facility'}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">{booking.purpose}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>📅 {new Date(booking.date).toLocaleDateString()}</span>
                                <span>🕒 {booking.startTime} - {booking.endTime}</span>
                                <span>💵 ${booking.pricing?.total ?? 0}</span>
                              </div>
                            </div>
                            <Badge className={getBookingStatusClassName(booking.status)}>
                              {getBookingStatusLabel(booking.status)}
                            </Badge>
                          </div>

                          <div className="text-sm">
                            <p className="text-gray-600">
                              <strong>Booked by:</strong>{' '}
                              {booking.user?.name ?? 'Unknown'} ({booking.user?.email ?? 'N/A'})
                            </p>
                          </div>
                        </div>

                        {/* Action buttons — right side */}
                        <div className="flex gap-2">
                          {/* Approve/Reject — only for pending bookings */}
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => onApproveBooking(booking._id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onRejectBooking(booking._id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* ✅ ADDED: Delete button — available on ALL bookings for admin */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteBooking(booking._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facilities" className="mt-6">
            <AdminFacilitiesTab
              facilities={facilities}
              externalCenters={externalCenters}
              loadingExternal={loadingExternal}
              confirmedBookingsByFacilityId={confirmedBookingsByFacilityId}
              facilityFilter={facilityFilter}
              onFacilityFilterChange={onFacilityFilterChange}
              onVerifyFacility={onVerifyFacility}
              onDeleteFacility={onDeleteFacility}
              onRemoveExternalFacility={onRemoveExternalFacility}
              onLoadExternalCenters={onLoadExternalCenters}
            />
          </TabsContent>

          {/* Payments Tab — unchanged */}
          <TabsContent value="payments" className="mt-6">
            <AdminPaymentsTab
              payments={payments}
              loading={loading}
              onProcess={processPayment}
              onDelete={deletePayment}
              onUpdateStatus={updateStatus}
            />
          </TabsContent>

          {/* Revenue Tracking Tab — unchanged */}
          <TabsContent value="revenue" className="mt-6">
            <RevenueTrackingTab />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}