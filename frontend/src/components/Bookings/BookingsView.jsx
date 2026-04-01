//import { Calendar, Clock, DollarSign, Filter, MapPin, X } from 'lucide-react';
import { Calendar, Clock, DollarSign, Download, Filter, MapPin, X } from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { getBookingStatusClassName, getBookingStatusLabel } from '../common/bookingStatus.jsx';

export function BookingsView({
  filteredBookings,
  filterStatus,
  onFilterStatusChange,
  stats,
  onCancelBooking,
  onDownloadReceipt, // receipt download handler
  isLoading,
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl mb-2">My Bookings</h1>
          <p className="text-blue-100">Manage and track your facility reservations</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl text-green-600 mb-1">{stats.confirmed}</div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl text-yellow-600 mb-1">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl text-red-600 mb-1">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no-show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading your bookings...</p>
            </CardContent>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-4">
                {filterStatus === 'all'
                  ? "You haven't made any bookings yet."
                  : `No ${filterStatus} bookings found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking._id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      {/* ✅ Fixed: facility name from populated object */}
                      <h3 className="text-xl mb-1">
                        {booking.facility?.name || 'Facility'}
                      </h3>
                      <p className="text-sm text-gray-600">{booking.purpose}</p>
                    </div>
                    <Badge className={getBookingStatusClassName(booking.status)}>
                      {getBookingStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(booking.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{booking.startTime} - {booking.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      {/* ✅ Fixed: pricing.total instead of totalCost */}
                      <span>${booking.pricing?.total}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {booking.facility?.location?.address?.city || 'Community Center'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* ✅ Fixed: onClick added for pending cancel */}
                    {booking.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelBooking(booking._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel Request
                      </Button>
                    )}
                    {booking.status === 'confirmed' && (
                      <>
                        {/* ✅ Download Receipt button — triggers print-to-PDF */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDownloadReceipt(booking)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download Receipt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelBooking(booking._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel Booking
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}