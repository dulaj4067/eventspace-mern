import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Calendar, Users, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import logo from '../../assets/logo.png';
import { applyLeafletDefaultIcon } from './leafletDefaultIcon.jsx';
import { getAllEvents } from '../../services/eventService';

import { facilityIcon, eventIcon, MAP_TILES } from '../../utils/mapUtils';

export function Home() {
  applyLeafletDefaultIcon();
  const [mapLocations, setMapLocations] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [scrollFade, setScrollFade] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setMapLoading(true);
        
        // Fetch Facilities
        const facResponse = await fetch('/api/facilities?limit=100');
        let dbFacilities = [];
        if (facResponse.ok && facResponse.headers.get('content-type')?.includes('application/json')) {
          const facPayload = await facResponse.json();
          dbFacilities = facPayload.success ? facPayload.data || [] : [];
        } else {
          console.warn("Facilities API returned non-JSON or error:", facResponse.status);
        }

        // Fetch Events
        let dbEvents = [];
        try {
          const eventResponse = await getAllEvents();
          dbEvents = eventResponse.data.success ? eventResponse.data.data : [];
        } catch (err) {
          console.error("Failed to fetch events:", err);
        }

        const normalizedFacilities = dbFacilities.map((facility) => {
          const lat = facility.location?.coordinates?.latitude;
          const lon = facility.location?.coordinates?.longitude;
          const isValid = typeof lat === 'number' && typeof lon === 'number' && isFinite(lat) && isFinite(lon);
          
          return {
            id: facility._id,
            name: facility.name,
            type: 'facility',
            category: facility.type || 'Facility',
            position: isValid ? [lat, lon] : null,
            icon: facilityIcon,
            description: facility.description
          };
        }).filter(item => item.position !== null);

        const normalizedEvents = dbEvents.map((event) => {
          // Check if facility is an object or just an ID
          const facilityData = event.facility && typeof event.facility === 'object' ? event.facility : null;
          const lat = facilityData?.location?.coordinates?.latitude;
          const lon = facilityData?.location?.coordinates?.longitude;
          const isValid = typeof lat === 'number' && typeof lon === 'number' && isFinite(lat) && isFinite(lon);
          
          return {
            id: event._id,
            name: event.name,
            type: 'event',
            category: event.type || 'Event',
            position: isValid ? [lat, lon] : null,
            icon: eventIcon,
            description: event.description,
            date: event.schedule?.date
          };
        }).filter(item => item.position !== null);

        const externalRaw = sessionStorage.getItem('externalCommunityCenters');
        const externalCenters = externalRaw ? JSON.parse(externalRaw) : [];
        const normalizedExternal = externalCenters
          .filter((center) => 
            Array.isArray(center.coordinates) && 
            center.coordinates.length === 2 &&
            typeof center.coordinates[0] === 'number' &&
            typeof center.coordinates[1] === 'number' &&
            isFinite(center.coordinates[0]) &&
            isFinite(center.coordinates[1])
          )
          .map((center) => ({
            id: center.id,
            name: center.name,
            type: 'facility',
            category: center.type || 'Community Center',
            position: center.coordinates,
            icon: facilityIcon
          }));

        if (isMounted) {
          setMapLocations([...normalizedFacilities, ...normalizedEvents, ...normalizedExternal]);
        }
      } catch (err) {
        console.error("Data fetch error:", err);
        if (isMounted) setMapLocations([]);
      } finally {
        if (isMounted) setMapLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const heroHeight = window.innerHeight || 1;
      const ratio = Math.min(window.scrollY / (heroHeight * 0.6), 1);
      setScrollFade(1 - ratio);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedMapLocations = useMemo(() => {
    if (!userLocation) return mapLocations;

    const [userLat, userLon] = userLocation;
    const toRadians = (value) => (value * Math.PI) / 180;
    const distanceInKm = (position) => {
      const [lat, lon] = position;
      const earthRadiusKm = 6371;
      const dLat = toRadians(lat - userLat);
      const dLon = toRadians(lon - userLon);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(userLat)) * Math.cos(toRadians(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    return [...mapLocations].sort((a, b) => distanceInKm(a.position) - distanceInKm(b.position));
  }, [mapLocations, userLocation]);

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    if (sortedMapLocations.length > 0) return sortedMapLocations[0].position;
    return [6.9271, 79.8612]; // Default to Colombo if no data or GPS
  }, [sortedMapLocations, userLocation]);

  const stats = [
    { label: 'Active Events', value: '150+', icon: Calendar },
    { label: 'Community Centers', value: '12', icon: MapPin },
    { label: 'Members', value: '5000+', icon: Users },
    { label: 'Hours Booked', value: '10k+', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section with Background Image */}
      <div className="relative h-[90vh] overflow-hidden">
        {/* Background Image with Parallax effect and Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 ease-out"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop")',
            transform: `scale(${1 + (1 - scrollFade) * 0.1})`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 h-full flex flex-col justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl"
            >
              <motion.img
                src={logo}
                alt="EventSpace"
                className="w-32 h-32 mb-8 drop-shadow-2xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <h1 className="text-5xl md:text-7xl text-white mb-6 font-extrabold tracking-tight">
                Empower Your <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Community</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-2xl">
                The all-in-one platform to book premium facilities, organize vibrant events, and foster meaningful local connections.
              </p>
              
              <div className="flex flex-wrap gap-4" style={{ opacity: scrollFade }}>
                <Link to="/facilities" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/30">
                  Browse Facilities <ArrowRight size={20} />
                </Link>
                <Link to="/events" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full font-bold transition-all border border-white/30">
                  Explore Events
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-20 -mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 group-hover:from-blue-100 group-hover:to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4 transition-colors">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Map Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 block">Live Community Map</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Discover What's Happening</h2>
              <p className="text-lg text-slate-600">Explore local facilities and upcoming events in your neighborhood in real-time. Find the perfect space or join an event today.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div> Facilities
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold border border-purple-100">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div> Events
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[700px] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-10"
            >
              <TileLayer
                url={MAP_TILES.LIGHT}
                attribution={MAP_TILES.ATTRIBUTION}
              />
              {sortedMapLocations.map((location) => (
                <Marker 
                  key={`${location.type}-${location.id}`} 
                  position={location.position}
                  icon={location.icon}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${
                        location.type === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {location.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{location.name}</h3>
                      {location.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{location.description}</p>
                      )}
                      {location.date && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                          <Calendar size={12} /> {new Date(location.date).toLocaleDateString()}
                        </div>
                      )}
                      <Link 
                        to={location.type === 'event' ? `/events/${location.id}` : `/facilities/${location.id}`} 
                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          location.type === 'event' 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        View Details <ExternalLink size={14} />
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            
            {!mapLoading && mapLocations.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">No locations found</h3>
                  <p className="text-slate-500">We couldn't find any events or facilities near you.</p>
                </div>
              </div>
            )}
            
            {mapLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold text-slate-700">Loading live community data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Why Choose EventSpace?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Everything you need to discover, book, and manage community activities in one sleek platform.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: 'Seamless Booking',
                description: 'Lock in your preferred venue in seconds with our real-time availability engine.',
                icon: Clock,
                color: 'from-blue-500 to-cyan-500',
              },
              {
                title: 'Community First',
                description: 'Designed specifically to help local organizers and residents connect and grow.',
                icon: Users,
                color: 'from-purple-500 to-indigo-500',
              },
              {
                title: 'Live Tracking',
                description: 'Stay updated with interactive maps and real-time event notifications.',
                icon: MapPin,
                color: 'from-pink-500 to-rose-500',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all border border-slate-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
