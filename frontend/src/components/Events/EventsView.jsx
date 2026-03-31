import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, Search, Users } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function EventsView({
  events,
  filteredEvents,
  eventTypes,
  searchTerm,
  onSearchTermChange,
  filterType,
  onFilterTypeChange,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">Community Events</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Discover and join exciting events happening in your community
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
              >
                Grid
              </button>
              <button
                onClick={() => onViewModeChange('map')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'map' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="h-[600px]">
              <MapContainer
                center={[40.7128, -74.006]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {filteredEvents.map((event) => (
                  <Marker key={event._id} position={event.coordinates || [40.7128, -74.006]}>
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold mb-1">{event.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{event.type}</p>
                        <p className="text-sm mb-1">📅 {new Date(event.schedule?.date).toLocaleDateString()}</p>
                        <p className="text-sm mb-1">🕒 {event.schedule?.startTime} - {event.schedule?.endTime}</p>
                        <p className="text-sm mb-2">📍 {event.facility?.name || 'TBA'}</p>
                        <Link to={`/event/${event._id}`} className="text-purple-600 text-sm hover:underline">
                          View Details →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                Showing {filteredEvents.length} of {events.length} events
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <Card key={event._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-gradient-to-r from-blue-400 to-purple-400">
                    {event.image && (
                      <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                    )}
                    <Badge className="absolute top-3 right-3 bg-white text-gray-900">
                      {event.type}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-2">{event.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.schedule?.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{event.schedule?.startTime} - {event.schedule?.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{event.facility?.name || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.attendance?.currentAttendees || 0}/{event.attendance?.maxAttendees || 0} attending
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Link
                      to={`/event/${event._id}`}
                      className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white hover:from-blue-700 hover:to-purple-700 transition-colors"
                    >
                      View Details & Register
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}