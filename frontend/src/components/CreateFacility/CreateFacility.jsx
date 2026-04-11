import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Building, DollarSign, Users, Image as ImageIcon, Crop, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.jsx';
import { FacilityLocationPicker, emptyLocation } from './FacilityLocationPicker.jsx';
import { FacilityHoursSection, createDefaultWeeklySchedule } from './FacilityHoursSection.jsx';
import { hasAcceptedTerms, setTermsAcceptance } from '../common/TermsConsentBar.jsx';
import { TERMS_TITLE, TERMS_SECTIONS } from '../../content/termsOfService.js';

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
      if (blob) {
        resolve(blob);
      }
    }, 'image/jpeg');
  });
}

function padTime(t) {
  if (!t || typeof t !== 'string') return '09:00';
  const parts = t.split(':');
  const h = String(parts[0] ?? '9').padStart(2, '0');
  const m = String(parts[1] ?? '0').padStart(2, '0');
  return `${h}:${m}`;
}

function buildScheduleForApi(schedule) {
  const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const out = {};
  for (const k of keys) {
    const d = schedule[k];
    out[k] = {
      isOpen: !!d?.isOpen,
      openTime: padTime(d?.openTime),
      closeTime: padTime(d?.closeTime),
    };
  }
  return out;
}

function timeToMinutes(t) {
  const [h, m] = padTime(t).split(':').map(Number);
  return h * 60 + m;
}

function validateWeeklySchedule(schedule) {
  const dayLabel = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };
  for (const key of Object.keys(dayLabel)) {
    const d = schedule[key];
    if (!d?.isOpen) continue;
    if (timeToMinutes(d.openTime) >= timeToMinutes(d.closeTime)) {
      return `${dayLabel[key]}: closing time must be after opening time.`;
    }
  }
  return null;
}

function buildFacilityPayload(formData, locationBlock, uploadedImages, weeklySchedule, closedExceptions) {
  const amenities = formData.amenities
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const contact = {};
  if (formData.contactName.trim()) contact.name = formData.contactName.trim();
  if (formData.contactEmail.trim()) contact.email = formData.contactEmail.trim();
  if (formData.contactPhone.trim()) contact.phone = formData.contactPhone.trim();

  const exceptions = closedExceptions.map((ex) => ({
    date: new Date(`${ex.date}T12:00:00`),
    isClosed: true,
    ...(ex.reason ? { reason: ex.reason } : {}),
  }));

  return {
    name: formData.name.trim(),
    type: formData.type,
    description: formData.description.trim(),
    capacity: Number(formData.capacity),
    hourlyRate: Number(formData.hourlyRate),
    images: uploadedImages,
    amenities,
    location: {
      building: locationBlock.building?.trim() || undefined,
      floor: locationBlock.floor?.trim() || undefined,
      room: locationBlock.room?.trim() || undefined,
      address: {
        street: locationBlock.address?.street?.trim() || '',
        city: locationBlock.address?.city?.trim() || '',
        state: locationBlock.address?.state?.trim() || '',
        zipCode: locationBlock.address?.zipCode?.trim() || '',
        country: locationBlock.address?.country?.trim() || '',
      },
      coordinates: {
        latitude: Number(locationBlock.coordinates.latitude),
        longitude: Number(locationBlock.coordinates.longitude),
      },
    },
    contactPerson: Object.keys(contact).length ? contact : undefined,
    availability: {
      status: 'available',
      schedule: buildScheduleForApi(weeklySchedule),
      ...(exceptions.length ? { exceptions } : {}),
    },
  };
}

export function CreateFacility() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationBlock, setLocationBlock] = useState(emptyLocation);
  const [weeklySchedule, setWeeklySchedule] = useState(createDefaultWeeklySchedule);
  const [closedExceptions, setClosedExceptions] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    capacity: '',
    hourlyRate: '',
    amenities: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [termsGateOpen, setTermsGateOpen] = useState(false);
  const [termsReadOpen, setTermsReadOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const facilityTypes = [
    'Conference Room', 'Meeting Room', 'Auditorium', 'Studio', 'Fitness Center',
    'Dining Hall', 'Kitchen', 'Outdoor Space', 'Sports Facility', 'Multipurpose Hall', 'Other',
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please sign in to list a facility');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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

  const validateBasics = () => {
    if (!formData.name || !formData.type || !formData.description || !formData.capacity || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return false;
    }
    const lat = locationBlock.coordinates?.latitude;
    const lon = locationBlock.coordinates?.longitude;
    if (lat == null || lon == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      toast.error('Please pin a location using search, a suggestion, or “Use my current location”.');
      return false;
    }
    const scheduleErr = validateWeeklySchedule(weeklySchedule);
    if (scheduleErr) {
      toast.error(scheduleErr);
      return false;
    }
    return true;
  };

  const runCreate = async () => {
    setIsSubmitting(true);
    try {
      let uploadedImages = [];

      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          uploadedImages.push({ url: uploadData.imageUrl, isPrimary: true });
        } else {
          toast.error(uploadData.message || 'Image upload failed');
          setIsSubmitting(false);
          return;
        }
      }

      const token = sessionStorage.getItem('token');
      const payload = buildFacilityPayload(
        formData,
        locationBlock,
        uploadedImages,
        weeklySchedule,
        closedExceptions,
      );

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app';
      const res = await fetch(`${API_BASE_URL}/api/facilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Facility submitted for review.');
        setTimeout(() => navigate('/facilities'), 1200);
      } else {
        toast.error(data.message || data.error || 'Failed to create facility');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while creating the facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!validateBasics()) return;

    if (!hasAcceptedTerms()) {
      setTermsGateOpen(true);
      return;
    }

    setApprovalOpen(true);
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
        <Card className="shadow-xl border-purple-100/80">
          <CardHeader>
            <h2 className="text-3xl">Facility details</h2>
            <p className="text-gray-600">Fields align with our directory — pin a location so guests can find you.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
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
                  <div className="mt-4 relative group w-full rounded-lg border border-gray-200 bg-slate-100 flex items-center justify-center p-2 sm:p-3 min-h-[12rem] max-h-[min(70vh,28rem)]">
                    <img
                      src={imagePreview}
                      alt="Facility cover preview"
                      className="max-h-[min(65vh,26rem)] w-full max-w-full h-auto object-contain object-center"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
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

              <FacilityLocationPicker
                value={locationBlock}
                onChange={setLocationBlock}
                disabled={isSubmitting}
              />

              <div>
                <Label htmlFor="name">Facility name *</Label>
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
                    minLength={3}
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
                  placeholder="Describe the facility layout, amenities, and typical uses (min. 10 characters)…"
                  rows={4}
                  className="mt-2"
                  required
                  minLength={10}
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
                  <Label htmlFor="hourlyRate">Hourly rate ($) *</Label>
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

              <div>
                <Label htmlFor="amenities">Amenities (optional)</Label>
                <Textarea
                  id="amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="Wi-Fi, projector, parking — separate with commas or new lines"
                  rows={2}
                  className="mt-2"
                />
              </div>

              <FacilityHoursSection
                schedule={weeklySchedule}
                onScheduleChange={setWeeklySchedule}
                exceptions={closedExceptions}
                onExceptionsChange={setClosedExceptions}
                disabled={isSubmitting}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800">Contact for this listing (optional)</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="contactName">Name</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="mt-1"
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
                  {isSubmitting ? 'Submitting…' : 'Submit listing'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Terms not accepted — must acknowledge */}
      <Dialog open={termsGateOpen} onOpenChange={setTermsGateOpen}>
        <DialogContent className="border-purple-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Terms of Service
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-left space-y-2">
              You have not accepted the EventSpace Terms of Service from the banner yet. To list a
              facility, review the terms (optional) and accept below to continue to submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => setTermsReadOpen(true)}
            >
              <FileText className="size-4" />
              Read terms
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setTermsGateOpen(false)}>
              Go back
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                setTermsAcceptance('accepted');
                setTermsGateOpen(false);
                setApprovalOpen(true);
              }}
            >
              Accept terms &amp; continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval process */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="border-purple-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Before we submit
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-slate-600 text-left space-y-3 text-sm pt-1">
                <p>
                  <strong className="text-slate-800">Admin review:</strong> New listings are reviewed by
                  our team. Your facility stays <strong>unpublished</strong> until it is approved.
                </p>
                <p>
                  <strong className="text-slate-800">What we check:</strong> Basic details, location
                  accuracy, and that the listing matches our community guidelines.
                </p>
                <p>
                  <strong className="text-slate-800">After approval:</strong> Approved spaces appear on
                  the public facilities map and can receive bookings according to your settings.
                </p>
                <p>
                  <strong className="text-slate-800">Edits:</strong> If you change a listing later, it may
                  need review again before updates go live.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setApprovalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              disabled={isSubmitting}
              onClick={() => {
                setApprovalOpen(false);
                runCreate();
              }}
            >
              Confirm submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={termsReadOpen} onOpenChange={setTermsReadOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {TERMS_TITLE}
            </DialogTitle>
            <DialogDescription className="text-left text-slate-600">
              Please read before accepting from the previous step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-700 pr-1">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.heading}>
                <h3 className="font-semibold text-slate-900 mb-1">{section.heading}</h3>
                <p className="leading-relaxed whitespace-pre-wrap">{section.body}</p>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
