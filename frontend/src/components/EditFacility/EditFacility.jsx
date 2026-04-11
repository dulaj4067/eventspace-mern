import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Building, DollarSign, Users, Image as ImageIcon, Crop, X } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import {
  EXTERNAL_CENTERS_STORAGE_KEY,
  loadExternalOverrides,
  saveExternalOverride,
} from '../../utils/externalFacilityClient.js';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg');
  });
}

const facilityTypes = [
  'Conference Room',
  'Meeting Room',
  'Auditorium',
  'Studio',
  'Fitness Center',
  'Dining Hall',
  'Kitchen',
  'Outdoor Space',
  'Sports Facility',
  'Multipurpose Hall',
  'Other',
];

export function EditFacility() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isExternal = id?.startsWith('community-');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    capacity: '',
    hourlyRate: '',
  });

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isExternal) {
          const raw = localStorage.getItem(EXTERNAL_CENTERS_STORAGE_KEY);
          const centers = raw ? JSON.parse(raw) : [];
          const base = centers.find((c) => c.id === id || c._id === id);
          if (!base) {
            throw new Error('Real-world listing not found. Open Facilities once to load data.');
          }
          const overrides = loadExternalOverrides()[id] || {};
          const merged = { ...base, ...overrides };
          if (!mounted) return;
          setFormData({
            name: merged.name || '',
            type: merged.type || 'Community Center',
            description: merged.description || '',
            capacity: String(merged.capacity ?? 80),
            hourlyRate: String(merged.hourlyRate ?? 20),
          });
          const img =
            merged.images?.[0]?.url ||
            merged.image ||
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';
          setImagePreview(img);
          setExistingImages(merged.images || []);
        } else {
          const token = sessionStorage.getItem('token');
          const res = await fetch(`/api/facilities/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const payload = await res.json();
          if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to load facility');
          }
          const f = payload.data;
          if (!mounted) return;
          setFormData({
            name: f.name || '',
            type: f.type || '',
            description: f.description || '',
            capacity: String(f.capacity ?? ''),
            hourlyRate: String(f.hourlyRate ?? ''),
          });
          const primary =
            f.primaryImage ||
            f.images?.find((img) => img.isPrimary)?.url ||
            f.images?.[0]?.url;
          if (primary) {
            setImagePreview(primary);
          }
          setExistingImages(f.images || []);
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, isExternal]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropperOpen(true);
      e.target.value = '';
    }
  };

  const showCroppedImage = async () => {
    try {
      if (!cropImageSrc || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      setImageFile(croppedFile);
      setImagePreview(URL.createObjectURL(croppedBlob));
      setCropperOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    }
  };

  const cancelCrop = () => {
    setCropperOpen(false);
    setCropImageSrc(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.description || !formData.capacity || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isExternal) {
        saveExternalOverride(id, {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          capacity: Number(formData.capacity),
          hourlyRate: Number(formData.hourlyRate),
        });
        toast.success('Real-world listing updated locally.');
        navigate('/admin');
        return;
      }

      let uploadedImages = [...existingImages];

      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedImages = [{ url: uploadData.imageUrl, isPrimary: true }];
        } else {
          toast.error(uploadData.message || 'Image upload failed');
          setIsSubmitting(false);
          return;
        }
      }

      const token = sessionStorage.getItem('token');
      const res = await fetch(`/api/facilities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity),
          hourlyRate: Number(formData.hourlyRate),
          images: uploadedImages,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Facility updated. Changes may require admin approval before going public.');
        navigate('/admin');
      } else {
        toast.error(data.message || 'Failed to update facility');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to admin
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4">
              {isExternal ? 'Edit real-world listing' : 'Edit facility'}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {isExternal
                ? 'Updates are stored locally and shown on the facilities map and admin.'
                : 'Platform listings may require admin approval again after you save.'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-3xl">Facility details</h2>
            <p className="text-gray-600">Update the information below</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isExternal && (
                <div>
                  <Label htmlFor="image">Facility cover image</Label>
                  <div className="relative mt-2">
                    <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="pl-10 cursor-pointer"
                    />
                  </div>

                  {cropperOpen ? (
                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden flex flex-col relative shadow-sm">
                      <div className="relative h-64 w-full overflow-hidden bg-slate-50">
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-md opacity-50 transform scale-110"
                          style={{ backgroundImage: `url(${cropImageSrc})` }}
                        />
                        <div className="absolute inset-0 backdrop-blur-sm bg-white/30 z-0" />
                        <Cropper
                          image={cropImageSrc}
                          crop={crop}
                          zoom={zoom}
                          aspect={16 / 9}
                          onCropChange={setCrop}
                          onCropComplete={onCropComplete}
                          onZoomChange={setZoom}
                          style={{ containerStyle: { backgroundColor: 'transparent' } }}
                        />
                      </div>
                      <div className="p-4 bg-white flex justify-end gap-2 border-t relative z-10">
                        <Button type="button" variant="outline" onClick={cancelCrop}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                          onClick={showCroppedImage}
                        >
                          <Crop className="w-4 h-4" />
                          Apply crop
                        </Button>
                      </div>
                    </div>
                  ) : imagePreview ? (
                    <div className="mt-4 relative group w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={imagePreview}
                        alt="Facility cover preview"
                        className="w-full h-full object-cover aspect-[16/9]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> Remove image
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div>
                <Label htmlFor="name">Facility name *</Label>
                <div className="relative mt-2">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="type">Facility type *</Label>
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
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
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
                      className="pl-10"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly rate ($) *</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
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
                  onClick={() => navigate('/admin')}
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
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
