import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Users, DollarSign, Check } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Badge } from '../ui/badge.jsx';
import { toast } from 'sonner';
import { PaymentModal } from './PaymentModal.jsx';
import { FacilityImage } from '../common/FacilityImage.jsx';
import { FacilityRatings } from '../Rating/FacilityRatings.jsx';
import { EXTERNAL_CENTERS_STORAGE_KEY, loadExternalOverrides } from '../../utils/externalFacilityClient.js';

const timeSlots = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00'
];

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const FALLBACK_URL = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';

export function FacilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facility, setFacility] = useState(null);
  const [isLoadingFacility, setIsLoadingFacility] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  // NOTE: userBookings state removed — review submission is now in My Bookings page

  const [formData, setFormData] = useState({
    date: '', startTime: '', endTime: '', purpose: '', attendees: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const pendingBookingRef = useRef(null);

  // ── Fetch facility ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchFacility = async () => {
      try {
        setIsLoadingFacility(true);
        setLoadError('');
        if (id?.startsWith('community-')) {
          const centers = JSON.parse(localStorage.getItem(EXTERNAL_CENTERS_STORAGE_KEY) || '[]');
          const found = centers.find((c) => c.id === id);
          if (!found) throw new Error('Community center not found');
          const override = loadExternalOverrides()[id];
          if (isMounted) setFacility(override ? { ...found, ...override } : found);
          return;
        }
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/facilities/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load facility details');
        if (isMounted) setFacility(payload.data);
      } catch (err) {
        if (isMounted) setLoadError(err.message || 'Failed to load facility details');
      } finally {
        if (isMounted) setIsLoadingFacility(false);
      }
    };
    fetchFacility();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Resolve address ─────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const address = [
      facility?.location?.address?.street,
      facility?.location?.address?.city,
      facility?.location?.address?.state,
      facility?.location?.address?.zipCode,
      facility?.location?.address?.country,
    ].filter(Boolean).join(', ');

    if (address) { setResolvedAddress(address); return; }
    const lat = facility?.location?.coordinates?.latitude;
    const lon = facility?.location?.coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { setResolvedAddress(''); return; }

    (async () => {
      try {
        const res = await fetch('/api/location/reverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        });
        const payload = await res.json();
        if (res.ok && payload.success && isMounted)
          setResolvedAddress(payload.data.address?.displayName || payload.data.address?.street || '');
      } catch {}
    })();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  // ── Nearby places ───────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const lat = facility?.location?.coordinates?.latitude;
    const lon = facility?.location?.coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { setNearbyPlaces([]); return; }
    (async () => {
      try {
        const res = await fetch(
          `/api/location/external-places?latitude=${lat}&longitude=${lon}&searchTerm=parking&radius=2500`
        );
        const payload = await res.json();
        if (res.ok && payload.success && isMounted) setNearbyPlaces((payload.data || []).slice(0, 3));
      } catch {}
    })();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  // ── Route info ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const endLat = facility?.location?.coordinates?.latitude;
    const endLon = facility?.location?.coordinates?.longitude;
    if (!Number.isFinite(endLat) || !Number.isFinite(endLon) || !navigator.geolocation) {
      setRouteInfo(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/location/route?startLatitude=${pos.coords.latitude}&startLongitude=${pos.coords.longitude}&endLatitude=${endLat}&endLongitude=${endLon}`
          );
          const payload = await res.json();
          if (res.ok && payload.success && isMounted) setRouteInfo(payload.data);
        } catch {}
      },
      () => { if (isMounted) setRouteInfo(null); },
      { maximumAge: 120000, timeout: 5000 }
    );
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  // ── Normalized facility ─────────────────────────────────────────────────────
  const normalizedFacility = useMemo(() => {
    if (!facility) return null;
    const image =
      facility.primaryImage ||
      facility.images?.find((i) => i.isPrimary)?.url ||
      facility.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';
    const hourlyRate = facility.pricing?.hourlyRate ?? facility.hourlyRate ?? 0;
    return {
      ...facility,
      hourlyRate,
      amenities: [
        ...(facility.amenities || []),
        ...nearbyPlaces.map((p) => p.type).filter(Boolean).slice(0, 2).map((t) => `Nearby ${t}`),
      ],
    };
  }, [facility]);

  const todaySchedule = useMemo(() => {
    if (!normalizedFacility?.availability?.schedule) return null;
    return normalizedFacility.availability.schedule[DAY_NAMES[new Date().getDay()]] || null;
  }, [normalizedFacility]);

  // ── Duration & cost ─────────────────────────────────────────────────────────
  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const [sH, sM] = formData.startTime.split(':').map(Number);
    const [eH, eM] = formData.endTime.split(':').map(Number);
    const dur = (eH + eM / 60) - (sH + sM / 60);
    return dur > 0 ? dur : 0;
  };

  const duration = calculateDuration();
  const totalCost = parseFloat((duration * (normalizedFacility?.hourlyRate || 0)).toFixed(2));
  const serviceFee = parseFloat((totalCost * 0.02).toFixed(2));
  const grandTotal = parseFloat((totalCost + serviceFee).toFixed(2));
  const minDate = new Date().toISOString().split('T')[0];

  // ── Form submit ─────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const hourlyRate = normalizedFacility.hourlyRate || 0;
    const subtotal = parseFloat((duration * hourlyRate).toFixed(2));
    const fee = parseFloat((subtotal * 0.02).toFixed(2));
    const total = parseFloat((subtotal + fee).toFixed(2));

    const isExternal = id?.startsWith('community-') || id?.startsWith('external-');
    
    const bookingPayload = {
      facility: id,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      purpose: formData.purpose,
      attendees: { expected: formData.attendees ? parseInt(formData.attendees, 10) : 1 },
      pricing: {
        hourlyRate,
        subtotal,
        serviceFee: fee,
        discount: 0,
        total,
      },
    };

    if (isExternal) {
      // Ensure data is properly formatted for the backend Facility model
      bookingPayload.externalFacilityData = {
        name: normalizedFacility.name,
        type: normalizedFacility.type || 'Community Center',
        description: normalizedFacility.description || 'No description available.',
        capacity: normalizedFacility.capacity || 50,
        hourlyRate: normalizedFacility.hourlyRate || 0,
        amenities: normalizedFacility.amenities || [],
        images: normalizedFacility.images || [{ url: normalizedFacility.image, isPrimary: true }],
        location: normalizedFacility.location || {
          coordinates: {
            latitude: normalizedFacility.coordinates?.[0],
            longitude: normalizedFacility.coordinates?.[1],
          },
        },
        availability: normalizedFacility.availability || {
          status: 'available',
          schedule: {
            monday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            tuesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            wednesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            thursday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            friday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            saturday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            sunday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
          },
        },
        isActive: true,
        verified: true,
      };
    }

    pendingBookingRef.current = bookingPayload;
    setShowPayment(true);
  };

  const handlePaymentComplete = (bookingId, paymentId) => {
    pendingBookingRef.current = null;
    toast.success('Booking confirmed! Payment processed successfully.');
    navigate('/bookings');
  };

  const handlePaymentClose = () => {
    pendingBookingRef.current = null;
    setShowPayment(false);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (isLoadingFacility) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading facility details...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl mb-2">Unable to load facility</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <Link to="/facilities" className="text-blue-600 hover:underline">Return to facilities</Link>
        </div>
      </div>
    );
  }

  if (!normalizedFacility) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Facility not found</h2>
          <Link to="/facilities" className="text-blue-600 hover:underline">Return to facilities</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentModal
        isOpen={showPayment}
        onClose={handlePaymentClose}
        totalCost={totalCost}
        duration={duration}
        hourlyRate={normalizedFacility.hourlyRate}
        facilityName={normalizedFacility.name}
        onPaymentComplete={handlePaymentComplete}
        bookingPayload={pendingBookingRef.current}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/facilities" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to facilities
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Left column: facility details + ratings ── */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <FacilityImage
                facility={normalizedFacility}
                className="w-full h-64 lg:h-96 object-cover"
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl mb-2">{normalizedFacility.name}</h1>
                    <Badge className="text-sm">{normalizedFacility.type}</Badge>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">{normalizedFacility.description}</p>
                {resolvedAddress && <p className="text-sm text-gray-500 mb-6">{resolvedAddress}</p>}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Capacity</div>
                      <div className="font-semibold">{normalizedFacility.capacity} people</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Hourly Rate</div>
                      <div className="font-semibold">${normalizedFacility.hourlyRate}/hr</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {normalizedFacility.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg mb-3">Operating Hours</h3>
                  {todaySchedule ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      {DAY_NAMES.map((day) => {
                        const s = normalizedFacility.availability?.schedule?.[day];
                        if (!s) return null;
                        return (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}:</span>
                            <span className="font-semibold text-gray-900">
                              {s.isOpen ? `${s.openTime} – ${s.closeTime}` : 'Closed'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Monday – Friday:</span>
                        <span className="font-semibold text-gray-900">6:00 AM – 10:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday – Sunday:</span>
                        <span className="font-semibold text-gray-900">8:00 AM – 8:00 PM</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Reviews section (read-only — submit is in My Bookings) ── */}
            {!id?.startsWith('community-') && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <FacilityRatings facilityId={id} />
              </div>
            )}
          </div>

          {/* ── Right column: booking form ── */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl mb-6">Book This Facility</h2>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={minDate}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Select value={formData.startTime} onValueChange={(v) => setFormData({ ...formData, startTime: v })}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Select value={formData.endTime} onValueChange={(v) => setFormData({ ...formData, endTime: v })}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="attendees">Expected Attendees</Label>
                  <Input
                    id="attendees"
                    type="number"
                    min="1"
                    max={normalizedFacility.capacity}
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    placeholder={`Max ${normalizedFacility.capacity}`}
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Purpose of Booking *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Describe the purpose of your booking..."
                    rows={3}
                    required
                  />
                </div>

                {totalCost > 0 && (
                  <div className="rounded-xl overflow-hidden border border-blue-100">
                    <div className="bg-blue-600 px-4 py-2.5">
                      <span className="text-white text-sm font-semibold">Cost Estimate</span>
                    </div>
                    <div className="bg-blue-50 px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>${normalizedFacility.hourlyRate.toFixed(2)} × {duration} hr{duration !== 1 ? 's' : ''}</span>
                        <span>${totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Service fee (2%)</span>
                        <span>${serviceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-blue-200">
                        <span>Total Due</span>
                        <span className="text-blue-700 text-lg">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 text-base font-semibold"
                >
                  {loading ? 'Submitting…' : 'Proceed to Payment'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Payment is required to confirm your booking.
                  {routeInfo && ` Estimated drive: ${routeInfo.duration} ${routeInfo.durationUnit}.`}
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}