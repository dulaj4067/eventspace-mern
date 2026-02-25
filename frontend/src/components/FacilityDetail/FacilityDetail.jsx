import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { facilities, timeSlots } from '../../data/mockData.js';
import { ArrowLeft, Users, DollarSign, Check } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Badge } from '../ui/badge.jsx';
import { toast } from 'sonner';

export function FacilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const facility = facilities.find((f) => f.id === id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });

  const [loading, setLoading] = useState(false);

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Facility not found</h2>
          <Link to="/facilities" className="text-blue-600 hover:underline">
            Return to facilities
          </Link>
        </div>
      </div>
    );
  }

  const calculateCost = () => {
    if (formData.startTime && formData.endTime) {
      const start = parseInt(formData.startTime.split(':')[0]);
      const end = parseInt(formData.endTime.split(':')[0]);
      const hours = end - start;
      return hours > 0 ? hours * facility.hourlyRate : 0;
    }
    return 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.date || !formData.startTime || !formData.endTime || !formData.purpose) {
      toast.error('Please fill in all fields');
      return;
    }

    const cost = calculateCost();
    if (cost <= 0) {
      toast.error('Invalid time selection');
      return;
    }

    setLoading(true);
    toast.success('Booking request submitted successfully!');
    setTimeout(() => {
      navigate('/bookings');
    }, 1500);
  };

  const totalCost = calculateCost();
  const minDate = new Date().toISOString().split('T')[0];

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
              <img
                src={facility.image}
                alt={facility.name}
                className="w-full h-64 lg:h-96 object-cover"
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl mb-2">{facility.name}</h1>
                    <Badge className="text-sm">{facility.type}</Badge>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">{facility.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Capacity</div>
                      <div className="font-semibold">{facility.capacity} people</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Hourly Rate</div>
                      <div className="font-semibold">${facility.hourlyRate}/hour</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {facility.amenities.map((amenity) => (
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

                <div className="border-t pt-6">
                  <h3 className="text-lg mb-3">Operating Hours</h3>
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
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl mb-6">Book This Facility</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    min={minDate}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) =>
                        setFormData({ ...formData, startTime: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Select
                      value={formData.endTime}
                      onValueChange={(value) =>
                        setFormData({ ...formData, endTime: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="purpose">Purpose of Booking *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                    placeholder="Describe the purpose of your booking..."
                    rows={3}
                    required
                  />
                </div>

                {totalCost > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Estimated Cost:</span>
                      <span className="text-2xl font-semibold text-purple-600">
                        ${totalCost}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Based on {calculateCost() / facility.hourlyRate} hour(s) at $
                      {facility.hourlyRate}/hour
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Submit Booking Request
                </Button>

                <p className="text-sm text-gray-500 text-center">
                  Your booking request will be reviewed by our team and you'll receive
                  a confirmation email within 24 hours.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
