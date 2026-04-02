import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Building, DollarSign, Users, Tag, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CreateFacility() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    capacity: '',
    hourlyRate: '',
  });

  const facilityTypes = [
    'Conference Room', 'Meeting Room', 'Auditorium', 'Studio', 'Fitness Center',
    'Dining Hall', 'Kitchen', 'Outdoor Space', 'Sports Facility', 'Multipurpose Hall', 'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.description || !formData.capacity || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedImages = [];

      // 1. Upload the image if present
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          uploadedImages.push({ url: uploadData.imageUrl, isPrimary: true });
        } else {
          toast.error(uploadData.message || 'Image upload failed');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit facility
      const token = localStorage.getItem('token');
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity),
          hourlyRate: Number(formData.hourlyRate),
          images: uploadedImages
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Facility created successfully!');
        setTimeout(() => {
          navigate(`/facilities`);
        }, 1500);
      } else {
        toast.error(data.message || 'Failed to create facility');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while creating the facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">List Your Facility</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Share your space with the community and manage bookings effortlessly
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-3xl">Facility Details</h2>
            <p className="text-gray-600">Provide the necessary information about your space</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <Label htmlFor="image">Facility Cover Image</Label>
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
                <Label htmlFor="name">Facility Name *</Label>
                <div className="relative mt-2">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Downtown Community Center"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="type">Facility Type *</Label>
                <div className="mt-2">
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility type" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the facility layout, amenities, and typical uses..."
                  rows={4}
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Capacity *</Label>
                  <div className="relative mt-2">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Maximum people allowed"
                      className="pl-10"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="e.g., 50.00"
                      className="pl-10"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/facilities')}
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
                  {isSubmitting ? 'Creating...' : 'Create Facility'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
