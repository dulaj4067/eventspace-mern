import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, Search, Users, Plus, Locate, ExternalLink } from 'lucide-react';
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
      () => setUserLocation(null),
      { maximumAge: 120000, timeout: 6000 }
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
    if (event.coordinates && isValidCoords(event.coordinates)) return event.coordinates;
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

  // Sync with Facilities behavior: Sort by distance if user location is known
  const mapEvents = useMemo(() => {
    const eventsWithCoords = filteredEvents.map(e => ({ ...e, _coords: getEventCoords(e) }));
    if (!userLocation) return eventsWithCoords;

    const toRadians = (value) => (value * Math.PI) / 180;
    const [userLat, userLon] = userLocation;

    const distanceInKm = (event) => {
      const [lat, lon] = event._coords || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Number.MAX_SAFE_INTEGER;
      const earthRadiusKm = 6371;
      const dLat = toRadians(lat - userLat);
      const dLon = toRadians(lon - userLon);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(userLat)) *
          Math.cos(toRadians(lat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    return [...eventsWithCoords].sort((a, b) => distanceInKm(a) - distanceInKm(b));
  }, [filteredEvents, userLocation]);

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
            <h1 className="text-4xl md:text-5xl mb-4 font-bold tracking-tight">Community Events Hub</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8 font-medium">
              Join interactive experiences and connect with your neighborhood
            </p>
            <Link to="/create-event" className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3.5 rounded-full font-bold hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl">
              <Plus className="w-5 h-5 font-bold" />
              Host New Event
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
        <div className="bg-white rounded-[1.5rem] shadow-sm p-5 mb-10 relative z-20 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors" />
              <Input
                type="text"
                placeholder="Search by event title, host or location..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-12 h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-purple-500 font-medium"
              />
            </div>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-full md:w-[220px] h-12 rounded-xl bg-gray-50 border-gray-100 font-medium">
                <SelectValue placeholder="Event Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-2xl z-[3000]">
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type} className="font-medium focus:bg-purple-50">
                    {type === 'all' ? 'All Categories' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Grid
              </button>
              <button
                onClick={() => onViewModeChange('map')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'map' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-8 border-white overflow-hidden mb-12 relative z-0">
            <div className="h-[700px] relative z-0">
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
                {mapEvents
                  .filter(event => isValidCoords(event._coords) || isValidCoords(mapCenter))
                  .map((event) => (
                    <Marker 
                      key={event._id} 
                      position={isValidCoords(event._coords) ? event._coords : mapCenter}
                      icon={eventIcon}
                    >
                    <Popup className="custom-popup" offset={[0, -5]}>
                      <div className="p-3 min-w-[240px]">
                        <div className="h-36 mb-4 overflow-hidden rounded-[1.25rem] relative group/map">
                           <img 
                              src={event.image || getEventImage(event.type)} 
                              alt={event.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover/map:scale-115" 
                           />
                           <div className="absolute top-3 right-3">
                              <Badge className="bg-white/95 backdrop-blur-md text-purple-600 border-none shadow-sm">
                                  {event.type}
                              </Badge>
                           </div>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-xl mb-2 line-clamp-1">{event.name}</h3>
                        <div className="space-y-2 mb-5">
                          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
                             <div className="p-1 px-1.5 bg-gray-100 rounded-md text-slate-600"><Calendar size={12} /></div>
                             {new Date(event.schedule?.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
                             <div className="p-1 px-1.5 bg-gray-100 rounded-md text-slate-600"><Clock size={12} /></div>
                             {event.schedule?.startTime} - {event.schedule?.endTime}
                          </div>
                          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
                             <div className="p-1 px-1.5 bg-gray-100 rounded-md text-slate-600"><MapPin size={12} /></div>
                             <span className="truncate">{event.facility?.name || 'Local Community Spot'}</span>
                          </div>
                        </div>
                        <Link 
                          to={`/event/${event._id}`} 
                          className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-black text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-200"
                        >
                          Discover More <ExternalLink size={16} />
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
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-500 font-medium">
                Displaying <span className="text-gray-900 font-bold">{Math.min(filteredEvents.length, ITEMS_PER_PAGE)}</span> of <span className="text-gray-900 font-bold">{filteredEvents.length}</span> curated events
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {paginatedEvents.map((event) => (
                <Card key={event._id} className="overflow-hidden border-none shadow-sm hover:shadow-2xl transition-all duration-500 group rounded-[1.5rem] bg-white h-full flex flex-col">
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={event.image || getEventImage(event.type)}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4">
                        <Badge className="bg-white/95 backdrop-blur-md text-purple-600 font-bold border-none shadow-sm">
                          {event.type}
                        </Badge>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                             Learn More <ExternalLink size={14} />
                        </span>
                    </div>
                  </div>
                  <CardContent className="p-7 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors line-clamp-1">{event.name}</h3>
                    <p className="text-gray-500 text-sm mb-6 line-clamp-2 font-medium leading-relaxed">{event.description}</p>
                    <div className="space-y-3 mt-auto border-t pt-5 border-gray-50">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><Calendar className="w-4 h-4" /></div>
                        <span>{new Date(event.schedule?.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Clock className="w-4 h-4" /></div>
                        <span>{event.schedule?.startTime} - {event.schedule?.endTime}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600"><MapPin className="w-4 h-4" /></div>
                        <span className="truncate">{event.facility?.name || 'Local Venue'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><Users className="w-4 h-4" /></div>
                        <span>{event.attendance?.currentAttendees || 0}/{event.attendance?.maxAttendees || 0} Joined</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-7 pt-0">
                    <Link
                      to={`/event/${event._id}`}
                      className="w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3.5 text-white font-black shadow-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                    >
                      Book Ticket Now
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
          <div className="text-center py-24 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-gray-100">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Matching Events</h3>
            <p className="text-gray-500 font-medium max-w-xs mx-auto text-sm">Try adjusting your filters or search keywords to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
}