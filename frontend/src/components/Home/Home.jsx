import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, MapPin, Calendar, Users, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import logo from '../../assets/logo.png';
import { applyLeafletDefaultIcon } from './leafletDefaultIcon.jsx';
import { InteractiveTile } from './InteractiveTile.jsx';

export function Home() {
  applyLeafletDefaultIcon();
  const [mapLocations, setMapLocations] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [scrollFade, setScrollFade] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const fetchMapLocations = async () => {
      try {
        setMapLoading(true);
        const response = await fetch('/api/facilities?limit=100');
        const payload = await response.json();
        const dbFacilities = response.ok && payload.success ? payload.data || [] : [];

        const normalizedDb = dbFacilities.map((facility) => {
          const lat = facility.location?.coordinates?.latitude;
          const lon = facility.location?.coordinates?.longitude;
          return {
            id: facility._id,
            name: facility.name,
            type: facility.type,
            position:
              Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : [40.7128, -74.006],
          };
        });

        const externalRaw = localStorage.getItem('externalCommunityCenters');
        const externalCenters = externalRaw ? JSON.parse(externalRaw) : [];
        const normalizedExternal = externalCenters
          .filter((center) => Array.isArray(center.coordinates) && center.coordinates.length === 2)
          .map((center) => ({
            id: center.id,
            name: center.name,
            type: center.type || 'Community Center',
            position: center.coordinates,
          }));

        if (isMounted) {
          setMapLocations([...normalizedDb, ...normalizedExternal]);
        }
      } catch {
        if (isMounted) {
          setMapLocations([]);
        }
      } finally {
        if (isMounted) {
          setMapLoading(false);
        }
      }
    };

    fetchMapLocations();

    return () => {
      isMounted = false;
    };
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
    return userLocation || sortedMapLocations[0]?.position || [40.7128, -74.006];
  }, [sortedMapLocations, userLocation]);

  const stats = [
    { label: 'Active Events', value: '150+', icon: Calendar },
    { label: 'Community Centers', value: '12', icon: MapPin },
    { label: 'Members', value: '5000+', icon: Users },
    { label: 'Hours Booked', value: '10k+', icon: Clock },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Map */}
      <div className="relative h-screen">
        {/* Map Background */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {sortedMapLocations.map((location) => (
              <Marker key={location.id} position={location.position}>
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">{location.name}</h3>
                    <p className="text-sm text-gray-600">{location.type}</p>
                    <Link to="/facilities" className="text-purple-600 text-sm hover:underline">
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 h-full bg-gradient-to-b from-black/50 via-black/30 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <motion.img
                src={logo}
                alt="EventSpace"
                className="w-48 h-48 mx-auto mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <h1 className="text-5xl md:text-6xl lg:text-7xl text-white mb-6 font-bold">
                Discover Your Space
              </h1>
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
                Book community facilities, create events, and bring people together
              </p>
              {mapLoading && <p className="text-white/80 mt-3">Loading live map locations...</p>}
            </motion.div>

            {/* Interactive Tiles */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto transition-opacity duration-300"
              style={{ opacity: scrollFade }}
            >
              <InteractiveTile
                title="Create Event"
                description="Organize and host your event"
                icon={<Plus className="w-8 h-8" />}
                gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                link="/create-event"
                features={[
                  'Choose from 8+ facilities',
                  'Real-time availability',
                  'Instant confirmation',
                  'Flexible scheduling',
                ]}
              />
              <InteractiveTile
                title="Find Location"
                description="Explore nearby community spaces"
                icon={<Search className="w-8 h-8" />}
                gradient="bg-gradient-to-br from-purple-600 to-pink-600"
                link="/facilities"
                features={[
                  'Interactive map view',
                  'Filter by amenities',
                  'Compare prices',
                  '12 locations available',
                ]}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose EventSpace?</h2>
            <p className="text-xl text-gray-600">Everything you need to manage community spaces</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Easy Booking',
                description: 'Book facilities in just a few clicks with our intuitive platform',
                icon: Calendar,
                color: 'from-blue-600 to-blue-700',
              },
              {
                title: 'Secure Payments',
                description: 'Safe and encrypted payment processing for peace of mind',
                icon: MapPin,
                color: 'from-purple-600 to-purple-700',
              },
              {
                title: 'Real-time Updates',
                description: 'Get instant notifications about your bookings and events',
                icon: Users,
                color: 'from-pink-600 to-pink-700',
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
                  className="bg-white rounded-3xl p-8 shadow-lg"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
