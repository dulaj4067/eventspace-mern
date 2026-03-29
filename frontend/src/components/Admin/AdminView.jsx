import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.jsx';
import { getBookingStatusClassName, getBookingStatusLabel } from '../common/bookingStatus.jsx';

export function AdminView({
  bookings,
  facilities,
  stats,
  onApproveBooking,
  onRejectBooking,
  confirmedBookingsByFacilityId,
}) {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-gradient-to-r from-slate-800 via-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl mb-2">Admin Dashboard</h1>
          <p className="text-slate-300">Manage facilities and bookings</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Facilities</p>
                  <p className="text-3xl">{stats.totalFacilities}</p>
                </div>
                <Building2 className="w-12 h-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                  <p className="text-3xl">{stats.totalBookings}</p>
                </div>
                <Calendar className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
                  <p className="text-3xl text-yellow-600">{stats.pendingBookings}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl text-green-600">${stats.revenue}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Tabs: Bookings / Facilities ── */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
          </TabsList>

          {/* ── Bookings Tab ── */}
          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <h2 className="text-2xl">All Bookings</h2>
                <p className="text-gray-600">Review and manage booking requests</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No bookings found.</p>
                  )}

                  {bookings.map((booking) => (
                    // ✅ Use _id from MongoDB (not id)
                    <div
                      key={booking._id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              {/* Facility name — populated from backend via .populate('facility') */}
                              <h3 className="text-lg mb-1">
                                {booking.facility?.name ?? 'Unknown Facility'}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">{booking.purpose}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>📅 {new Date(booking.date).toLocaleDateString()}</span>
                                <span>🕒 {booking.startTime} - {booking.endTime}</span>
                                {/* Total cost from pricing.total (real DB field) */}
                                <span>💵 ${booking.pricing?.total ?? 0}</span>
                              </div>
                            </div>
                            <Badge className={getBookingStatusClassName(booking.status)}>
                              {getBookingStatusLabel(booking.status)}
                            </Badge>
                          </div>

                          {/* User info — populated from backend via .populate('user') */}
                          <div className="text-sm">
                            <p className="text-gray-600">
                              <strong>Booked by:</strong>{' '}
                              {booking.user?.name ?? 'Unknown'} ({booking.user?.email ?? 'N/A'})
                            </p>
                          </div>
                        </div>

                        {/* Approve / Reject buttons — only show for pending bookings */}
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              // ✅ Fixed: pass _id instead of id
                              onClick={() => onApproveBooking(booking._id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              // ✅ Fixed: pass _id instead of id
                              onClick={() => onRejectBooking(booking._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Facilities Tab ── */}
          <TabsContent value="facilities" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl">Facilities Overview</h2>
                    <p className="text-gray-600">View and manage community facilities</p>
                  </div>
                  <Button>Add New Facility</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilities.length === 0 && (
                    <p className="text-gray-500 text-center py-8 col-span-2">No facilities found.</p>
                  )}

                  {facilities.map((facility) => {
                    // ✅ Fixed: use _id to match confirmed bookings map from real DB data
                    const facilityBookings =
                      confirmedBookingsByFacilityId.get(facility._id) ?? 0;

                    return (
                      <div
                        key={facility._id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-4">
                          <img
                            src={facility.image}
                            alt={facility.name}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg mb-1">{facility.name}</h3>
                            <Badge variant="secondary" className="mb-2">
                              {facility.type}
                            </Badge>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>{facility.capacity} people</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>${facility.hourlyRate}/hour</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>{facilityBookings} confirmed bookings</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}