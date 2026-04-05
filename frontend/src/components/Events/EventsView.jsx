import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, Search, Users, Plus, Locate, Maximize2, ExternalLink } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getEventImage } from '../../services/eventService';
import { ModernPagination } from '../common/ModernPagination.jsx';
import { eventIcon, MAP_TILES } from '../../utils/mapUtils';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

function LocateControl({ onLocate }) {
  const map = useMap();
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = [position.coords.latitude, position.coords.longitude];
        map.flyTo(pos, 15, { duration: 2 });
        onLocate(pos);
      });
    }
  };
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '70px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleLocate}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 text-purple-600 transition-colors"
          title="Locate me"
        >
          <Locate size={20} />
        </button>
      </div>
    </div>
  );
}

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
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => setUserLocation(null)
    );
  }, []);

  const isValidCoords = (coords) => {
    return Array.isArray(coords) && 
           coords.length === 2 && 
           typeof coords[0] === 'number' && 
           typeof coords[1] === 'number' &&
           !isNaN(coords[0]) && !isNaN(coords[1]);
  };

  const getEventCoords = (event) => {
    if (event.coordinates) return event.coordinates;
    const loc = event.facility?.location?.coordinates;
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return [loc.latitude, loc.longitude];
    }
    return null;
  };

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    const firstEventWithCoords = filteredEvents.find(e => isValidCoords(getEventCoords(e)));
    if (firstEventWithCoords) return getEventCoords(firstEventWithCoords);
    return [6.9271, 79.8612]; // Default to Colombo
  }, [userLocation, filteredEvents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">Community Events</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Discover and join exciting events happening in your community
            </p>
            <Link to="/create-event" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors shadow-lg">
              <Plus className="w-5 h-5" />
              Add Event
            </Link>
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-8 border-white overflow-hidden mb-8 relative z-0">
            <div className="h-[650px] relative z-0">
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="z-10"
              >
                <TileLayer
                  url={MAP_TILES.LIGHT}
                  attribution={MAP_TILES.ATTRIBUTION}
                />
                <MapController center={mapCenter} />
                <LocateControl onLocate={setUserLocation} />
                {filteredEvents
                  .map(event => ({ ...event, _mapCoords: getEventCoords(event) }))
                  .filter(event => isValidCoords(event._mapCoords) || isValidCoords(mapCenter))
                  .map((event) => (
                    <Marker 
                      key={event._id} 
                      position={event._mapCoords || mapCenter}
                      icon={eventIcon}
                    >
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[200px]">
                        <div className="h-32 mb-3 overflow-hidden rounded-xl bg-gradient-to-r from-blue-400 to-purple-400">
                           <img 
                              src={event.image || getEventImage(event.type)} 
                              alt={event.name}
                              className="w-full h-full object-cover transition-transform hover:scale-110 duration-500" 
                           />
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 bg-purple-100 text-purple-700">
                          {event.type}
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{event.name}</h3>
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar size={12} /> {new Date(event.schedule?.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={12} /> {event.schedule?.startTime} - {event.schedule?.endTime}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={12} /> {event.facility?.name || 'Local Venue'}
                          </div>
                        </div>
                        <Link 
                          to={`/event/${event._id}`} 
                          className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-purple-200"
                        >
                          View Details <ExternalLink size={14} />
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
                Showing {Math.min(filteredEvents.length, ITEMS_PER_PAGE)} of {filteredEvents.length} events
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedEvents.map((event) => (
                <Card key={event._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-gradient-to-r from-blue-400 to-purple-400">
                    <img
                      src={event.image || getEventImage(event.type)}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
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

            {totalPages > 1 && (
              <ModernPagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
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