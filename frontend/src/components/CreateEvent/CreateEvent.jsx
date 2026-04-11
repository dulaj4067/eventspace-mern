import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Calendar, Clock, Users, MapPin, Tag, Image as ImageIcon, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { createEvent } from '../../services/eventService';
import axios from 'axios';

export function CreateEvent() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: '',
    description: '',
    facilityId: '',
    date: '',
    startTime: '',
    endTime: '',
    expectedAttendees: '',
    isFree: true,
    price: '',
    currency: 'USD',
  });

  const eventTypes = ['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'];

  useEffect(() => {
    const fetchFacilities = async () => {
      setIsLoadingFacilities(true);
      try {
        const response = await axios.get('/api/facilities');
        setFacilities(response.data.data || []);
      } catch (err) {
        console.error('Failed to load facilities', err);
        toast.error('Failed to load facilities');
      } finally {
        setIsLoadingFacilities(false);
      }
    };
    fetchFacilities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.eventName || !formData.facilityId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.isFree && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error('Please enter a valid ticket price');
      return;
    }

    try {
      setLoading(true);
      let imageUrl = null;

      // Upload Event Poster Image if provided
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          imageUrl = uploadData.imageUrl;
        } else {
          toast.error(uploadData.message || 'Image upload failed');
          setLoading(false);
          return;
        }
      }

      await createEvent({
        name: formData.eventName,
        type: formData.eventType || 'other',
        description: formData.description,
        facility: formData.facilityId,
        image: imageUrl,
        schedule: {
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
        },
        attendance: {
          maxAttendees: parseInt(formData.expectedAttendees) || 50,
        },
        pricing: {
          isFree: formData.isFree,
          price: formData.isFree ? 0 : parseFloat(formData.price),
          currency: formData.currency,
        },
      });

      toast.success('Event created successfully!');
      setTimeout(() => {
        navigate('/my-events');
      }, 1500);

    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create event';
      toast.error(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">Create Your Event</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Plan your event and hook it into our community
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-3xl">Event Details</h2>
            <p className="text-gray-600">Provide everything people need to know</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <Label htmlFor="image">Event Poster Image</Label>
                <div className="relative mt-2">
                  <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="pl-10 cursor-pointer"
                  />
                </div>
              </div>

              {/* Event Name */}
              <div>
                <Label htmlFor="eventName">Event Name *</Label>
                <div className="relative mt-2">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="eventName"
                    type="text"
                    value={formData.eventName}
                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                    placeholder="e.g., Community Yoga Workshop"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your event..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Facility */}
              <div>
                <Label htmlFor="facility">Select Facility *</Label>
                <div className="relative mt-2">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <Select
                    value={formData.facilityId}
                    onValueChange={(value) => setFormData({ ...formData, facilityId: value })}
                    disabled={isLoadingFacilities}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder={isLoadingFacilities ? "Loading facilities..." : "Choose a facility"} />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility._id} value={facility._id}>
                          {facility.name} - {facility.type} {facility.hourlyRate ? `($${facility.hourlyRate}/hr)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Event Date *</Label>
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="pl-10"
                      min={minDate}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <div className="relative mt-2">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <div className="relative mt-2">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="expectedAttendees">Expected Number of Attendees</Label>
                <div className="relative mt-2">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="expectedAttendees"
                    type="number"
                    value={formData.expectedAttendees}
                    onChange={(e) => setFormData({ ...formData, expectedAttendees: e.target.value })}
                    placeholder="Estimated number of people"
                    className="pl-10"
                    min="1"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <Label className="text-lg font-semibold">Ticket Pricing</Label>

                {/* Free or Paid toggle */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFree: true, price: '' })}
                    className={`flex-1 py-3 rounded-lg font-semibold border-2 transition-colors ${
                      formData.isFree
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                    }`}
                  >
                    🎟️ Free Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFree: false })}
                    className={`flex-1 py-3 rounded-lg font-semibold border-2 transition-colors ${
                      !formData.isFree
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    💰 Paid Event
                  </button>
                </div>

                {/* Price input - only show if paid */}
                {!formData.isFree && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Ticket Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="price"
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0.00"
                          className="pl-10"
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Pricing summary */}
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  formData.isFree
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {formData.isFree
                    ? '✅ This event is free — no payment required for registration'
                    : `💳 Attendees will be charged ${formData.price || '0'} ${formData.currency} to register`}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/events')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}