import { useEffect, useMemo, useState } from 'react';
import {
  EXTERNAL_CENTERS_STORAGE_KEY,
  applyExternalOverrides,
  loadHiddenExternalIds,
} from '../../utils/externalFacilityClient.js';

const FALLBACK_COORDINATES = [40.7128, -74.006];
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

function toAddressString(address = {}) {
  return [address.street, address.city, address.state, address.zipCode, address.country]
    .filter(Boolean)
    .join(', ');
}

function mapFacilityFromApi(facility) {
  const primaryImage =
    facility.primaryImage ||
    facility.images?.find((image) => image.isPrimary)?.url ||
    facility.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';

  const lat = facility.location?.coordinates?.latitude;
  const lon = facility.location?.coordinates?.longitude;
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

  return {
    id: facility.externalId || facility._id,
    _id: facility._id,
    name: facility.name,
    type: facility.type,
    capacity: facility.capacity,
    amenities: facility.amenities || [],
    hourlyRate: facility.hourlyRate,
    image: primaryImage,
    description: facility.description,
    available: facility.availability?.status === 'available',
    coordinates: hasCoordinates ? [lat, lon] : null,
    address: facility.location?.address || {},
    isExternal: !!facility.isExternal,
  };
}

function getGoogleStreetViewImage(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !GOOGLE_MAPS_API_KEY) {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/streetview?size=1200x700&location=${latitude},${longitude}&fov=90&heading=235&pitch=10&key=${GOOGLE_MAPS_API_KEY}`;
}

function getLocationMapSnapshot(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';
  }

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=16&size=1200x700&markers=${latitude},${longitude},red-pushpin`;
}

function mapCommunityCenter(center) {
  const latitude = Number.parseFloat(center.latitude);
  const longitude = Number.parseFloat(center.longitude);
  const googleStreetViewImage = getGoogleStreetViewImage(latitude, longitude);
  const locationMapImage = getLocationMapSnapshot(latitude, longitude);
  const addressText = center.address || 'Community center location';

  return {
    id: `community-${center.id}`,
    _id: `community-${center.id}`,
    name: center.name || 'Community Center',
    type: 'Community Center',
    capacity: 80,
    amenities: [center.operator ? `Operator: ${center.operator}` : 'Public community space'],
    hourlyRate: 20,
    image: googleStreetViewImage || locationMapImage,
    description: `${addressText}. Real-world community center sourced from OpenStreetMap data.`,
    available: true,
    coordinates: [latitude, longitude],
    address: {},
    location: {
      address: {},
      coordinates: { latitude, longitude },
    },
    images: [
      {
        url: googleStreetViewImage || locationMapImage,
        isPrimary: true,
      },
    ],
    isExternal: true,
  };
}

function computeBoundingBox(facilities) {
  const points = facilities
    .map((facility) => facility.coordinates)
    .filter((coordinates) => Array.isArray(coordinates) && coordinates.length === 2);

  if (points.length === 0) {
    return null;
  }

  const lats = points.map((point) => point[0]);
  const lons = points.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const pad = 0.06;

  return {
    minLat: minLat - pad,
    minLon: minLon - pad,
    maxLat: maxLat + pad,
    maxLon: maxLon + pad,
  };
}

function expandBoundingBox(box, pad = 0.2) {
  return {
    minLat: box.minLat - pad,
    minLon: box.minLon - pad,
    maxLat: box.maxLat + pad,
    maxLon: box.maxLon + pad,
  };
}

async function fetchCommunityCentersForBox(box) {
  const response = await fetch(
    `/api/community-centers?minLat=${box.minLat}&minLon=${box.minLon}&maxLat=${box.maxLat}&maxLon=${box.maxLon}`,
  );
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    return [];
  }
  return payload.data || [];
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

export function useFacilitiesState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [facilities, setFacilities] = useState([]);
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchFacilities = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch('/api/facilities?limit=100');
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to load facilities');
        }

        const normalizedFacilities = (payload.data || []).map((facility) => {
          const mapped = mapFacilityFromApi(facility);
          return {
            ...mapped,
            coordinates: mapped.coordinates || FALLBACK_COORDINATES,
          };
        });

        const hiddenExternal = loadHiddenExternalIds();
        const cachedCentersRaw = sessionStorage.getItem(EXTERNAL_CENTERS_STORAGE_KEY);
        const cachedCenters = (cachedCentersRaw ? JSON.parse(cachedCentersRaw) : [])
          .map(applyExternalOverrides)
          .filter((f) => !hiddenExternal.has(f.id));
        let mergedFacilities = dedupeById([...normalizedFacilities, ...cachedCenters]);
        const bbox = computeBoundingBox(normalizedFacilities);

        if (isMounted) {
          setFacilities(mergedFacilities);
          setIsLoading(false);
        }

        if (bbox) {
          try {
            let centers = await fetchCommunityCentersForBox(bbox);

            // Retry with a wider search area when the initial box has no Overpass hits.
            if (!centers.length) {
              centers = await fetchCommunityCentersForBox(expandBoundingBox(bbox));
            }

            const mappedCenters = centers
              .filter((center) => {
                const lat = Number.parseFloat(center.latitude);
                const lon = Number.parseFloat(center.longitude);
                return Number.isFinite(lat) && Number.isFinite(lon);
              })
              .map(mapCommunityCenter)
              .map(applyExternalOverrides)
              .filter((f) => !hiddenExternal.has(f.id));

            const centersToUse = mappedCenters.length > 0 ? mappedCenters : cachedCenters;
            mergedFacilities = dedupeById([...normalizedFacilities, ...centersToUse]);
            if (mappedCenters.length > 0) {
              sessionStorage.setItem(EXTERNAL_CENTERS_STORAGE_KEY, JSON.stringify(mappedCenters));
            }
            if (isMounted) {
              setFacilities(mergedFacilities);
            }
          } catch {
            // Keep base facilities if external community centers fail
          }
        }

      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Something went wrong while loading facilities');
          setFacilities([]);
          setIsLoading(false);
        }
      }
    };

    fetchFacilities();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const shouldSearchByAddress = searchTerm.trim().length >= 3;
    if (!shouldSearchByAddress) {
      setNearbyFacilities([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const autocompleteResponse = await fetch(
          `/api/location/autocomplete?query=${encodeURIComponent(searchTerm.trim())}`,
        );
        const autocompletePayload = await autocompleteResponse.json();

        if (!autocompleteResponse.ok || !autocompletePayload.success || !autocompletePayload.data?.length) {
          if (isMounted) setNearbyFacilities([]);
          return;
        }

        const selectedAddress = autocompletePayload.data[0].displayName;
        const nearbyResponse = await fetch('/api/location/search-by-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: selectedAddress, radiusKm: 20 }),
        });
        const nearbyPayload = await nearbyResponse.json();

        if (!nearbyResponse.ok || !nearbyPayload.success || !Array.isArray(nearbyPayload.data)) {
          if (isMounted) setNearbyFacilities([]);
          return;
        }

        const normalizedNearby = nearbyPayload.data
          .map((item) => item.facility)
          .filter(Boolean)
          .map(mapFacilityFromApi)
          .map((facility) => ({
            ...facility,
            coordinates: facility.coordinates || FALLBACK_COORDINATES,
          }));

        if (isMounted) {
          setNearbyFacilities(normalizedNearby);
        }
      } catch {
        if (isMounted) {
          setNearbyFacilities([]);
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const facilityTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(facilities.map((f) => f.type)))];
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const sourceFacilities =
      normalizedSearch.length >= 3 && nearbyFacilities.length > 0 ? nearbyFacilities : facilities;

    return sourceFacilities
      .filter((facility) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          facility.name.toLowerCase().includes(normalizedSearch) ||
          facility.description.toLowerCase().includes(normalizedSearch);
        const matchesType = filterType === 'all' || facility.type === filterType;
        return matchesSearch && matchesType;
      });
  }, [facilities, nearbyFacilities, filterType, searchTerm]);

  return {
    facilities,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    facilityTypes,
    filteredFacilities,
    isLoading,
    errorMessage,
  };
}

