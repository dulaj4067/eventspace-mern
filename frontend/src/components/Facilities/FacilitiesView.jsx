import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { ModernPagination } from '../common/ModernPagination.jsx';
import { DollarSign, Search, Users, Plus } from 'lucide-react';
import L from 'leaflet';
import { Input } from '../ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Badge } from '../ui/badge.jsx';
import { Card, CardContent, CardFooter } from '../ui/card.jsx';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FacilityImage } from '../common/FacilityImage.jsx';
import { facilityIcon, MAP_TILES } from '../../utils/mapUtils';
import { Locate, Maximize2 } from 'lucide-react';
import { useMap } from 'react-leaflet';

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
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 text-blue-600 transition-colors"
          title="Locate me"
        >
          <Locate size={20} />
        </button>
      </div>
    </div>
  );
}

export function FacilitiesView({
  facilities,
  filteredFacilities,
  facilityTypes,
  searchTerm,
  onSearchTermChange,
  filterType,
  onFilterTypeChange,
  viewMode,
  onViewModeChange,
  isLoading,
  errorMessage,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const isValidCoords = (coords) => {
    return Array.isArray(coords) && 
           coords.length === 2 && 
           typeof coords[0] === 'number' && 
           typeof coords[1] === 'number' &&
           !isNaN(coords[0]) && !isNaN(coords[1]);
  };

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    const firstWithCoords = filteredFacilities.find((f) => isValidCoords(f.coordinates));
    if (firstWithCoords) return firstWithCoords.coordinates;
    return [6.9271, 79.8612]; // Default to Colombo
  }, [userLocation, filteredFacilities]);
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setUserLocation(null);
      },
      { maximumAge: 120000, timeout: 6000 },
    );
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredFacilities.length / ITEMS_PER_PAGE));
  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredFacilities.slice(start, end);
  }, [filteredFacilities, currentPage]);

  const mapFacilities = useMemo(() => {
    if (!userLocation) return filteredFacilities;

    const toRadians = (value) => (value * Math.PI) / 180;
    const [userLat, userLon] = userLocation;

    const distanceInKm = (facility) => {
      const [lat, lon] = facility.coordinates || [];
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

    return [...filteredFacilities].sort((a, b) => distanceInKm(a) - distanceInKm(b));
  }, [filteredFacilities, userLocation]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">Browse Community Facilities</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Discover and reserve facilities for your events, meetings, and activities
            </p>
            <Link to="/create-facility" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors shadow-lg">
              <Plus className="w-5 h-5" />
              Add Facility
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8 relative z-20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search facilities..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="z-[2500]">
                {facilityTypes.map((type) => (
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

        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600">Loading facilities...</p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <>
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
                {mapFacilities
                  .filter(f => isValidCoords(f.coordinates) || isValidCoords(mapCenter))
                  .map((facility) => (
                    <Marker 
                      key={facility.id} 
                      position={isValidCoords(facility.coordinates) ? facility.coordinates : mapCenter}
                      icon={facilityIcon}
                    >
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[200px]">
                        <div className="h-32 mb-3 overflow-hidden rounded-xl">
                           <FacilityImage facility={facility} className="w-full h-full object-cover transition-transform hover:scale-110 duration-500" />
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 bg-blue-100 text-blue-700">
                          {facility.type}
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{facility.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                          <span className="flex items-center gap-1"><Users size={14} /> {facility.capacity}</span>
                          <span className="flex items-center gap-1"><DollarSign size={14} /> ${facility.hourlyRate}/hr</span>
                        </div>
                        <Link 
                          to={`/facility/${facility.id}`} 
                          className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-blue-200"
                        >
                          View & Book <Maximize2 size={14} />
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
                Showing {Math.min(filteredFacilities.length, ITEMS_PER_PAGE)} of {filteredFacilities.length} facilities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedFacilities.map((facility) => (
                <Card key={facility.id} className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  <div className="relative h-48">
                    <FacilityImage facility={facility} className="w-full h-full object-cover" />
                    <Badge className="absolute top-3 right-3 bg-white text-gray-900">
                      {facility.type}
                    </Badge>
                  </div>
                  <CardContent className="p-6 flex-1">
                    <h3 className="text-xl mb-2">{facility.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[60px]">{facility.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Capacity: {facility.capacity} people</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>${facility.hourlyRate}/hour</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {facility.amenities.slice(0, 3).map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {facility.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{facility.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Link
                      to={`/facility/${facility.id}`}
                      className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white hover:from-blue-700 hover:to-purple-700 transition-colors"
                    >
                      View Details & Book
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

        {filteredFacilities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No facilities found matching your criteria.</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
