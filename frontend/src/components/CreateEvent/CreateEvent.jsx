import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Calendar, Clock, Users, MapPin, Tag, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CreateEvent() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [availableFacilities, setAvailableFacilities] = useState([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: '',
    description: '',
    facilityId: '',
    date: '',
    startTime: '',
    endTime: '',
    expectedAttendees: '',
  });

  const eventTypes = ['conference', 'seminar', 'workshop', 'concert', 'exhibition', 'sports', 'social', 'other'];

  useEffect(() => {
    let isMounted = true;
    const fetchFacilities = async () => {
      setIsLoadingFacilities(true);
      try {
        const res = await fetch('/api/facilities?limit=100');
        const data = await res.json();
        if (isMounted && data.success) {
          setAvailableFacilities(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch facilities', err);
      } finally {
        if (isMounted) setIsLoadingFacilities(false);
      }
    };
    fetchFacilities();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.eventName || !formData.eventType || !formData.facilityId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // 1. Upload Event Poster Image
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          imageUrl = uploadData.imageUrl;
        } else {
          toast.error(uploadData.message || 'Image upload failed');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit to actual backend
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.eventName,
        type: formData.eventType.toLowerCase(),
        description: formData.description,
        facility: formData.facilityId,
        image: imageUrl,
        schedule: {
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime
        },
        attendance: {
          maxAttendees: Number(formData.expectedAttendees) || 0
        }
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Event created successfully! Redirecting...');
        setTimeout(() => {
          navigate(`/events`);
        }, 1500);
      } else {
        toast.error(data.message || 'Failed to create event. Make sure you are logged in.');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
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
                <Label htmlFor="eventType">Event Type *</Label>
                <div className="mt-2">
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your event, its purpose, and what attendees can expect..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Facility Selection */}
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
                      {availableFacilities.map((facility) => (
                        <SelectItem key={facility._id} value={facility._id}>
                          {facility.name} - {facility.type} (${facility.hourlyRate}/hr)
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/events')}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
