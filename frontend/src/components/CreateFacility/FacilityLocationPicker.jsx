import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { MapPin, Navigation, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';

const emptyLocation = () => ({
  building: '',
  floor: '',
  room: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  coordinates: {
    latitude: null,
    longitude: null,
  },
  displayLabel: '',
});

export function FacilityLocationPicker({ value, onChange, disabled }) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef(null);

  const merge = useCallback(
    (patch) => {
      const base = value || emptyLocation();
      onChange({
        ...base,
        ...patch,
        address: { ...(base.address || {}), ...(patch.address || {}) },
        coordinates: { ...(base.coordinates || {}), ...(patch.coordinates || {}) },
      });
    },
    [value, onChange],
  );

  useEffect(() => {
    if (search.trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/location/autocomplete?query=${encodeURIComponent(search.trim())}`,
        );
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setSuggestions(data.data);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const enrichFromCoordinates = async (latitude, longitude, displayLabel) => {
    setResolving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
      const res = await fetch(`${API_BASE_URL}/api/location/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.address) {
        merge({
          coordinates: { latitude, longitude },
          displayLabel: displayLabel || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
        return;
      }
      const addr = data.data.address;
      const structured = addr.address || {};
      merge({
        displayLabel: addr.displayName || displayLabel || '',
        coordinates: {
          latitude: data.data.latitude ?? latitude,
          longitude: data.data.longitude ?? longitude,
        },
        address: {
          street: structured.street || structured.road || '',
          city: structured.city || structured.town || structured.village || '',
          state: structured.state || '',
          zipCode: structured.zipCode || structured.postcode || '',
          country: structured.country || '',
        },
      });
    } catch {
      merge({
        coordinates: { latitude, longitude },
        displayLabel: displayLabel || 'Selected location',
      });
    } finally {
      setResolving(false);
    }
  };

  const handlePickSuggestion = async (s) => {
    setSearch(s.displayName);
    setSuggestions([]);
    await enrichFromCoordinates(s.latitude, s.longitude, s.displayName);
  };

  const handleGeocodeTypedAddress = async () => {
    const q = search.trim();
    if (q.length < 3) return;
    setResolving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
      const res = await fetch(`${API_BASE_URL}/api/location/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        toast.error(data.message || 'Could not find that address. Try a suggestion from the list.');
        return;
      }
      const { latitude, longitude, displayName } = data.data;
      await enrichFromCoordinates(latitude, longitude, displayName || q);
    } catch {
      toast.error('Could not pin that address. Try again or pick a suggestion.');
    } finally {
      setResolving(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setSearch('Current location');
        await enrichFromCoordinates(latitude, longitude, 'Your current location');
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const loc = value || emptyLocation();
  const pinned =
    loc.coordinates?.latitude != null &&
    loc.coordinates?.longitude != null &&
    Number.isFinite(Number(loc.coordinates.latitude)) &&
    Number.isFinite(Number(loc.coordinates.longitude));

  return (
    <div className="space-y-4 rounded-xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="size-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-slate-900">Location</h3>
          <p className="text-sm text-slate-600">
            Search an address, pick a suggestion, or use your current location. We pin coordinates
            so your space appears on maps and nearby searches.
          </p>
        </div>
      </div>

      <div className="relative">
        <Label htmlFor="location-search">Address search</Label>
        <div className="mt-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              id="location-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Start typing an address (min. 3 characters)…"
              className="pl-9"
              disabled={disabled}
              autoComplete="off"
            />
            {loadingSuggestions && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-purple-500" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-purple-200"
            onClick={handleGeocodeTypedAddress}
            disabled={disabled || resolving || search.trim().length < 3}
          >
            Pin address
          </Button>
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
            {suggestions.map((s, i) => (
              <li key={`${s.displayName}-${i}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-800"
                  onClick={() => handlePickSuggestion(s)}
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
          onClick={handleUseMyLocation}
          disabled={disabled || geoLoading}
        >
          {geoLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Navigation className="size-4" />
          )}
          Use my current location
        </Button>
        {resolving && (
          <span className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="size-4 animate-spin" />
            Resolving address…
          </span>
        )}
      </div>

      {pinned && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
          <p className="font-medium flex items-center gap-2">
            <MapPin className="size-4" />
            Location pinned
          </p>
          {loc.displayLabel && <p className="mt-1 text-emerald-800/90">{loc.displayLabel}</p>}
          <p className="text-xs mt-1 font-mono text-emerald-800/80">
            {Number(loc.coordinates.latitude).toFixed(5)}, {Number(loc.coordinates.longitude).toFixed(5)}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="loc-building">Building (optional)</Label>
          <Input
            id="loc-building"
            value={loc.building || ''}
            onChange={(e) => merge({ building: e.target.value })}
            placeholder="e.g. Main Hall"
            disabled={disabled}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="loc-floor">Floor (optional)</Label>
          <Input
            id="loc-floor"
            value={loc.floor || ''}
            onChange={(e) => merge({ floor: e.target.value })}
            placeholder="e.g. 2"
            disabled={disabled}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="loc-room">Room / unit (optional)</Label>
          <Input
            id="loc-room"
            value={loc.room || ''}
            onChange={(e) => merge({ room: e.target.value })}
            placeholder="e.g. A204"
            disabled={disabled}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <Label>Street</Label>
          <Input
            value={loc.address?.street || ''}
            onChange={(e) => merge({ address: { ...loc.address, street: e.target.value } })}
            className="mt-1"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>City</Label>
          <Input
            value={loc.address?.city || ''}
            onChange={(e) => merge({ address: { ...loc.address, city: e.target.value } })}
            className="mt-1"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>State / region</Label>
          <Input
            value={loc.address?.state || ''}
            onChange={(e) => merge({ address: { ...loc.address, state: e.target.value } })}
            className="mt-1"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>ZIP / postal code</Label>
          <Input
            value={loc.address?.zipCode || ''}
            onChange={(e) => merge({ address: { ...loc.address, zipCode: e.target.value } })}
            className="mt-1"
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Country</Label>
          <Input
            value={loc.address?.country || ''}
            onChange={(e) => merge({ address: { ...loc.address, country: e.target.value } })}
            className="mt-1"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export { emptyLocation };
