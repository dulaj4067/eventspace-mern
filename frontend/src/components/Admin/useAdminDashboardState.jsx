import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  EXTERNAL_CENTERS_STORAGE_KEY,
  applyExternalOverrides,
  loadHiddenExternalIds,
  addHiddenExternalId,
} from '../../utils/externalFacilityClient.js';

const API_BASE = '/api';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const DEFAULT_MAP_BBOX = {
  minLat: 40.65,
  minLon: -74.05,
  maxLat: 40.78,
  maxLon: -73.92,
};

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

function computeBoundingBoxFromMongoFacilities(facilities) {
  const points = facilities
    .map((f) => {
      const lat = f.location?.coordinates?.latitude;
      const lon = f.location?.coordinates?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return [lat, lon];
    })
    .filter(Boolean);

  if (points.length === 0) return null;

  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  const pad = 0.06;
  return {
    minLat: Math.min(...lats) - pad,
    minLon: Math.min(...lons) - pad,
    maxLat: Math.max(...lats) + pad,
    maxLon: Math.max(...lons) + pad,
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

export function useAdminDashboardState() {
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [externalCenters, setExternalCenters] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Status filter state — empty string means "All" (no filter)
  const [statusFilter, setStatusFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const externalFetchDoneRef = useRef(false);

  // ─── Fetch bookings ──────────────────────────────────────────────────────
  // Extracted into its own function so it can be re-called when statusFilter changes
  const fetchBookings = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // ✅ Append ?status= only when a filter is selected
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const bookingsRes = await fetch(`${API_BASE}/bookings${query}`, { headers });

      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');

      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.data ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load bookings');
    }
  }, [statusFilter]); // ✅ re-runs whenever statusFilter changes

  // ─── Fetch bookings & facilities on mount (parallel; real-world loads on demand) ─
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const [facilitiesRes, bookingsRes] = await Promise.all([
          fetch(`${API_BASE}/facilities?limit=500`, { headers }),
          fetch(`${API_BASE}/bookings`, { headers }),
        ]);

        if (!facilitiesRes.ok) throw new Error('Failed to fetch facilities');
        if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');

        const [facilitiesData, bookingsData] = await Promise.all([
          facilitiesRes.json(),
          bookingsRes.json(),
        ]);

        setFacilities(facilitiesData.data ?? []);
        setBookings(bookingsData.data ?? []);
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // runs once on mount

  const loadExternalCenters = useCallback(async (forceFacilities = null) => {
    const list = forceFacilities || facilities;
    
    // Only fetch once if we have facilities, or if explicitly forced
    if (externalFetchDoneRef.current && !forceFacilities) return;
    if (list.length > 0) externalFetchDoneRef.current = true;
    
    setLoadingExternal(true);
    try {
      let box = computeBoundingBoxFromMongoFacilities(list);
      if (!box) box = DEFAULT_MAP_BBOX;
      let centers = await fetchCommunityCentersForBox(box);
      if (!centers.length) {
        centers = await fetchCommunityCentersForBox(expandBoundingBox(box));
      }
      const mapped = centers
        .filter((center) => {
          const lat = Number.parseFloat(center.latitude);
          const lon = Number.parseFloat(center.longitude);
          return Number.isFinite(lat) && Number.isFinite(lon);
        })
        .map(mapCommunityCenter);
      if (mapped.length > 0) {
        sessionStorage.setItem(EXTERNAL_CENTERS_STORAGE_KEY, JSON.stringify(mapped));
      }
      const hidden = loadHiddenExternalIds();
      const visible = mapped
        .filter((f) => !hidden.has(f.id))
        .map(applyExternalOverrides);
      setExternalCenters(visible);
    } catch {
      const raw = sessionStorage.getItem(EXTERNAL_CENTERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const hidden = loadHiddenExternalIds();
      setExternalCenters(
        parsed.filter((f) => !hidden.has(f.id)).map(applyExternalOverrides),
      );
    } finally {
      setLoadingExternal(false);
    }
  }, [facilities]);

  // ✅ Auto-load external centers as soon as facilities are available
  useEffect(() => {
    if (facilities.length > 0 && !externalFetchDoneRef.current) {
        loadExternalCenters(facilities);
    }
  }, [facilities, loadExternalCenters]);

  // ✅ Re-fetch bookings whenever statusFilter changes (skip initial mount)
  const isFirstRender = useMemo(() => ({ current: true }), []);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fetchBookings]);

  // ─── Approve booking ─────────────────────────────────────────────────────
  const approveBooking = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'confirmed', reason: 'Approved by admin' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to approve booking');
      }

      // ✅ Optimistically update local state
      // If a status filter is active and this booking no longer matches,
      // remove it from the list. Otherwise just update its status.
      setBookings((prev) =>
        statusFilter && statusFilter !== 'confirmed'
          ? prev.filter((b) => b._id !== id)           // remove from filtered list
          : prev.map((b) => (b._id === id ? { ...b, status: 'confirmed' } : b))
      );
      toast.success('Booking approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve booking');
    }
  }, [statusFilter]);

  // ─── Reject booking ──────────────────────────────────────────────────────
  const rejectBooking = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled', reason: 'Rejected by admin' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to reject booking');
      }

      // ✅ Same smart optimistic update — remove if it no longer matches filter
      setBookings((prev) =>
        statusFilter && statusFilter !== 'cancelled'
          ? prev.filter((b) => b._id !== id)           // remove from filtered list
          : prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
      );
      toast.success('Booking rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject booking');
    }
  }, [statusFilter]);

  // ✅ ADDED: deleteBooking — admin can permanently delete any booking regardless of status.
  // Calls DELETE /api/bookings/:id (admin-only route).
  // Removes the booking from local state immediately after success.
  const deleteBooking = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete booking');
      }

      // ✅ Remove deleted booking from local state immediately
      setBookings((prev) => prev.filter((b) => b._id !== id));
      toast.success('Booking deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking');
    }
  }, []);

  const verifyFacility = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/facilities/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to approve facility');
      }

      const payload = await res.json();
      const updated = payload.data;
      setFacilities((prev) =>
        prev.map((f) =>
          f._id === id
            ? {
                ...f,
                verified: true,
                verificationDate: updated?.verificationDate ?? new Date().toISOString(),
              }
            : f,
        ),
      );
      toast.success('Facility approved — it can appear on the facilities page.');
    } catch (err) {
      toast.error(err.message || 'Failed to approve facility');
    }
  }, []);

  const deleteFacility = useCallback(async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/facilities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to remove listing');
      }
      setFacilities((prev) => prev.filter((f) => f._id !== id));
      toast.success('Listing removed from the platform.');
    } catch (err) {
      toast.error(err.message || 'Failed to remove listing');
    }
  }, []);

  const removeExternalFacility = useCallback((facilityId) => {
    addHiddenExternalId(facilityId);
    setExternalCenters((prev) => prev.filter((f) => (f.id ?? f._id) !== facilityId));
    toast.success('Real-world listing hidden from the map and admin.');
  }, []);

  // ─── Stats (always computed from ALL loaded bookings) ────────────────────
  const stats = useMemo(() => {
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    return {
      totalFacilities: facilities.length,
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      revenue: confirmedBookings.reduce((sum, b) => sum + (b.pricing?.total ?? 0), 0),
    };
  }, [bookings, facilities]);

  // ─── Confirmed bookings count per facility ───────────────────────────────
  const confirmedBookingsByFacilityId = useMemo(() => {
    const counts = new Map();
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue;
      const facilityId = booking.facility?._id ?? booking.facility;
      counts.set(facilityId, (counts.get(facilityId) ?? 0) + 1);
    }
    return counts;
  }, [bookings]);

  return {
    bookings,
    facilities,
    externalCenters,
    loadingExternal,
    stats,
    loading,
    error,
    approveBooking,
    rejectBooking,
    deleteBooking,              // ✅ ADDED
    verifyFacility,
    deleteFacility,
    removeExternalFacility,
    loadExternalCenters,
    confirmedBookingsByFacilityId,
    statusFilter,       // ✅ expose to Admin.jsx
    setStatusFilter,    // ✅ expose to Admin.jsx
    facilityFilter,
    setFacilityFilter,
  };
}