import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Users, DollarSign, Check } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Badge } from '../ui/badge.jsx';
import { toast } from 'sonner';
import { FacilityImage } from '../common/FacilityImage.jsx';
import { EXTERNAL_CENTERS_STORAGE_KEY, loadExternalOverrides } from '../../utils/externalFacilityClient.js';

// Time slots HH:MM format to match backend regex
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

  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: '',
  });

  const [loading, setLoading] = useState(false);

  // Fetch facility
  useEffect(() => {
    let isMounted = true;

    const fetchFacility = async () => {
      try {
        setIsLoadingFacility(true);
        setLoadError('');

        if (id?.startsWith('community-')) {
          const rawCenters = localStorage.getItem(EXTERNAL_CENTERS_STORAGE_KEY);
          const centers = rawCenters ? JSON.parse(rawCenters) : [];
          const externalFacility = centers.find((center) => center.id === id);
          if (!externalFacility) throw new Error('Community center not found');
          const override = loadExternalOverrides()[id];
          if (isMounted) setFacility(override ? { ...externalFacility, ...override } : externalFacility);
          return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/facilities/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to load facility details');
        }

        if (isMounted) setFacility(payload.data);
      } catch (error) {
        if (isMounted) setLoadError(error.message || 'Failed to load facility details');
      } finally {
        if (isMounted) setIsLoadingFacility(false);
      }
    };

    fetchFacility();
    return () => { isMounted = false; };
  }, [id]);

  // Resolve address
  useEffect(() => {
    let isMounted = true;

    const address = [
      facility?.location?.address?.street,
      facility?.location?.address?.city,
      facility?.location?.address?.state,
      facility?.location?.address?.zipCode,
      facility?.location?.address?.country,
    ].filter(Boolean).join(', ');

    if (address) {
      setResolvedAddress(address);
      return undefined;
    }

    const lat = facility?.location?.coordinates?.latitude;
    const lon = facility?.location?.coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setResolvedAddress('');
      return undefined;
    }

    const resolveAddress = async () => {
      try {
        const response = await fetch('/api/location/reverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
        if (isMounted) {
          setResolvedAddress(payload.data.address?.displayName || payload.data.address?.street || '');
        }
      } catch { /* optional */ }
    };

    resolveAddress();
    return () => { isMounted = false; };
  }, [facility]);



  // Route info
  useEffect(() => {
    let isMounted = true;
    const endLat = facility?.location?.coordinates?.latitude;
    const endLon = facility?.location?.coordinates?.longitude;
    if (!Number.isFinite(endLat) || !Number.isFinite(endLon) || !navigator.geolocation) {
      setRouteInfo(null);
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/location/route?startLatitude=${position.coords.latitude}&startLongitude=${position.coords.longitude}&endLatitude=${endLat}&endLongitude=${endLon}`
          );
          const payload = await response.json();
          if (!response.ok || !payload.success) return;
          if (isMounted) setRouteInfo(payload.data);
        } catch { /* optional */ }
      },
      () => { if (isMounted) setRouteInfo(null); },
      { maximumAge: 120000, timeout: 5000 }
    );

    return () => { isMounted = false; };
  }, [facility]);

  const normalizedFacility = useMemo(() => {
    if (!facility) return null;

    // ✅ Fixed: read hourlyRate from pricing object
    const hourlyRate =
      facility.pricing?.hourlyRate ||
      facility.hourlyRate ||
      0;

    return {
      ...facility,
      hourlyRate,
      amenities: [
        ...(facility.amenities || []),
      ],
    };
  }, [facility]);

  // Get today's operating hours from backend schedule
  const todaySchedule = useMemo(() => {
    if (!normalizedFacility?.availability?.schedule) return null;
    const day = DAY_NAMES[new Date().getDay()];
    return normalizedFacility.availability.schedule[day] || null;
  }, [normalizedFacility]);

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    return (endH + endM / 60) - (startH + startM / 60);
  };

  const calculateCost = () => {
    const duration = calculateDuration();
    return duration > 0 ? duration * (normalizedFacility?.hourlyRate || 0) : 0;
  };

  // ✅ Fixed: actually calls backend API
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.startTime || !formData.endTime || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const hourlyRate = normalizedFacility.hourlyRate || 0;
    const subtotal = duration * hourlyRate;
    const serviceFee = 0;
    const discount = 0;
    const total = subtotal + serviceFee - discount;

    const isExternal = id?.startsWith('community-') || id?.startsWith('external-');
    
    const bookingPayload = {
      facility: id,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      purpose: formData.purpose,
      attendees: {
        expected: formData.attendees ? parseInt(formData.attendees) : 1
      },
      pricing: {
        hourlyRate,
        subtotal,
        serviceFee,
        discount,
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
                longitude: normalizedFacility.coordinates?.[1]
            }
        },
        availability: normalizedFacility.availability || {
          status: 'available',
          schedule: {
            monday: { isOpen: true, openTime: '06:00',  closeTime: '22:00' },
            tuesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            wednesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            thursday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            friday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            saturday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
            sunday: { isOpen: true, openTime: '06:00', closeTime: '22:00' }
          }
        },
        isActive: true,
        verified: true
      };
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Booking failed');
      }

      toast.success('Booking request submitted successfully!');
      setTimeout(() => navigate('/bookings'), 1500);
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = calculateCost();
  const minDate = new Date().toISOString().split('T')[0];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/facilities"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to facilities
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Facility Details */}
          <div>
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
                {resolvedAddress && (
                  <p className="text-sm text-gray-500 mb-6">{resolvedAddress}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Capacity</div>
                      <div className="font-semibold">{normalizedFacility.capacity} people</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Hourly Rate</div>
                      <div className="font-semibold">${normalizedFacility.hourlyRate}/hour</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {normalizedFacility.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ✅ Fixed: Real operating hours from backend */}
                <div className="border-t pt-6">
                  <h3 className="text-lg mb-3">Operating Hours</h3>
                  {todaySchedule ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      {DAY_NAMES.map((day) => {
                        const schedule = normalizedFacility.availability?.schedule?.[day];
                        if (!schedule) return null;
                        return (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}:</span>
                            <span className="font-semibold text-gray-900">
                              {schedule.isOpen
                                ? `${schedule.openTime} - ${schedule.closeTime}`
                                : 'Closed'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Monday - Friday:</span>
                        <span className="font-semibold text-gray-900">6:00 AM - 10:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday - Sunday:</span>
                        <span className="font-semibold text-gray-900">8:00 AM - 8:00 PM</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
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
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Select
                      value={formData.endTime}
                      onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
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
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Estimated Cost:</span>
                      <span className="text-2xl font-semibold text-purple-600">${totalCost}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Based on {calculateDuration()} hour(s) at ${normalizedFacility.hourlyRate}/hour
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? 'Submitting...' : 'Submit Booking Request'}
                </Button>

                <p className="text-sm text-gray-500 text-center">
                  Your booking request will be reviewed by our team and you'll receive a
                  confirmation email within 24 hours.
                  {routeInfo && ` Typical drive: ${routeInfo.duration} ${routeInfo.durationUnit}.`}
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}