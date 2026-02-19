import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, Users, Clock, Sparkles } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import logo from '../assets/logo.png';

// Fix for default marker icon

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function InteractiveTile({ title, description, icon, gradient, link, features }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={link}>
      <motion.div
        className={`relative rounded-3xl p-8 cursor-pointer overflow-hidden ${gradient}`}
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          initial={{ height: '200px' }}
          animate={{ height: isHovered ? '350px' : '200px' }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              animate={{ scale: isHovered ? 1.2 : 1, rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white"
            >
              {icon}
            </motion.div>
            <Sparkles className="w-6 h-6 text-white/60" />
          </div>

          <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
          <p className="text-white/90 text-lg mb-4">{description}</p>

          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              height: isHovered ? 'auto' : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{
                    x: isHovered ? 0 : -20,
                    opacity: isHovered ? 1 : 0,
                  }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-white/10"
          animate={{
            scale: isHovered ? 1.5 : 1,
            opacity: isHovered ? 0.3 : 0,
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </Link>
  );
}

export function Home() {
  const communityLocations = [
    { id: 1, name: 'Main Community Center', position: [40.7128, -74.006], facilities: 5 },
    { id: 2, name: 'North District Center', position: [40.7580, -73.9855], facilities: 3 },
    { id: 3, name: 'East Community Hub', position: [40.7489, -73.9680], facilities: 4 },
    { id: 4, name: 'West Side Center', position: [40.7357, -74.0134], facilities: 2 },
  ];

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
            center={[40.7128, -74.006]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {communityLocations.map((location) => (
              <Marker key={location.id} position={location.position}>
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">{location.name}</h3>
                    <p className="text-sm text-gray-600">{location.facilities} facilities available</p>
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
            </motion.div>

            {/* Interactive Tiles */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
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