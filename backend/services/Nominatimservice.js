const axios = require('axios');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const axiosInstance = axios.create({
  timeout: 5000,
  headers: {
    'User-Agent': 'EventSpace-MERN-App'
  }
});

// CONVERT ADDRESS TO COORDINATES (GEOCODING)
const geocodeAddress = async (address) => {
  try {
    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    console.log(`🗺️ Geocoding: ${address}`);

    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        'accept-language': 'en'
      }
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const result = response.data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      boundingBox: {
        north: parseFloat(result.boundingbox[1]),
        south: parseFloat(result.boundingbox[0]),
        east: parseFloat(result.boundingbox[3]),
        west: parseFloat(result.boundingbox[2])
      },
      placeId: result.osm_id,
      type: result.type,
      importance: result.importance
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw error;
  }
};

// CONVERT COORDINATES TO ADDRESS (REVERSE GEOCODING)
const reverseGeocodeCoordinates = async (latitude, longitude) => {
  try {
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`🗺️ Reverse geocoding: ${latitude}, ${longitude}`);

    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        'accept-language': 'en',
        zoom: 18,
        addressdetails: 1
      }
    });

    if (!response.data || response.data.error) {
      return null;
    }

    const result = response.data;
    const address = result.address || {};

    return {
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      address: {
        street: address.road || address.footway || '',
        city: address.city || address.town || address.village || '',
        state: address.state || '',
        zipCode: address.postcode || '',
        country: address.country || '',
        countryCode: address.country_code?.toUpperCase() || ''
      },
      placeId: result.osm_id,
      type: result.type,
      category: result.category
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw error;
  }
};

// CALCULATE HAVERSINE DISTANCE BETWEEN TWO POINTS
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

// FILTER AND SORT FACILITIES BY PROXIMITY
const findNearbyFacilities = (userLat, userLon, facilities, radiusKm = 5) => {
  return facilities
    .map(facility => {
      if (!facility.location?.coordinates?.latitude || 
          !facility.location?.coordinates?.longitude) {
        return null;
      }

      const distance = calculateHaversineDistance(
        userLat,
        userLon,
        facility.location.coordinates.latitude,
        facility.location.coordinates.longitude
      );

      if (distance <= radiusKm) {
        return {
          facility,
          distance,
          distanceUnit: 'km'
        };
      }
      return null;
    })
    .filter(item => item !== null)
    .sort((a, b) => a.distance - b.distance);
};

// SEARCH FOR EXTERNAL PLACES (POI) NEAR COORDINATES
const searchNearbyPlaces = async (latitude, longitude, searchTerm, radius = 5000) => {
  try {
    console.log(`🗺️ Searching: "${searchTerm}"`);

    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: searchTerm,
        format: 'json',
        limit: 50,
        'accept-language': 'en',
        viewbox: [
          longitude - (radius / 111000),
          latitude - (radius / 111000),
          longitude + (radius / 111000),
          latitude + (radius / 111000)
        ].join(','),
        bounded: 1
      }
    });

    if (!response.data) return [];

    return response.data
      .map(place => ({
        name: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        type: place.type,
        category: place.class,
        importance: place.importance,
        placeId: place.osm_id,
        distance: calculateHaversineDistance(latitude, longitude, parseFloat(place.lat), parseFloat(place.lon))
      }))
      .filter(place => place.distance <= (radius / 1000))
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Place search error:', error.message);
    throw error;
  }
};

// GET ROUTE DISTANCE AND DURATION (OSRM)
const getRouteDistance = async (startLat, startLon, endLat, endLon) => {
  try {
    console.log(`🗺️ Calculating route...`);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`;

    const response = await axiosInstance.get(osrmUrl);

    if (!response.data.routes || response.data.routes.length === 0) {
      return null;
    }

    const route = response.data.routes[0];

    return {
      distance: (route.distance / 1000).toFixed(2),
      distanceUnit: 'km',
      duration: (route.duration / 60).toFixed(0),
      durationUnit: 'minutes',
      durationHours: (route.duration / 3600).toFixed(1)
    };
  } catch (error) {
    console.error('Route error:', error.message);
    throw error;
  }
};

// VALIDATE LATITUDE AND LONGITUDE FORMAT
const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: 'Invalid coordinate format' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180' };
  }

  return { valid: true, lat, lon };
};

// GET ADDRESS SUGGESTIONS FOR AUTOCOMPLETE
const getAddressSuggestions = async (query) => {
  try {
    if (!query || query.trim().length < 3) {
      return [];
    }

    console.log(`🗺️ Getting suggestions: ${query}`);

    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 10,
        'accept-language': 'en'
      }
    });

    if (!response.data) return [];

    return response.data.map(result => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      importance: result.importance
    }));
  } catch (error) {
    console.error('Autocomplete error:', error.message);
    return [];
  }
};

module.exports = {
  geocodeAddress,
  reverseGeocodeCoordinates,
  calculateHaversineDistance,
  findNearbyFacilities,
  searchNearbyPlaces,
  getRouteDistance,
  validateCoordinates,
  getAddressSuggestions
};