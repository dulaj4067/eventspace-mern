// ReviewModal.jsx
// Shown when user clicks "Write Review" on a confirmed booking in My Bookings page.
// Completely separate from receipt logic — does not touch downloadReceipt at all.

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { toast } from 'sonner';

// ── Star selector ─────────────────────────────────────────────────────────────
function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={28}
          className={`cursor-pointer transition-colors ${
            n <= display ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
          }`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const facilityName = booking.facility?.name || 'Facility';

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a star rating'); return; }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facility: booking.facility?._id || booking.facility,
          booking: booking._id,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to submit');

      toast.success('Review submitted successfully!');
      onSubmitted(booking._id); // notify parent so button can be hidden
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // ── Backdrop ──
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── Modal card ── */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Write a Review</h2>
            <p className="text-sm text-gray-500 mt-0.5">{facilityName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Overall rating */}
          <div>
            <Label className="text-sm text-gray-700 mb-2 block">Overall rating *</Label>
            <StarSelector value={rating} onChange={setRating} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-sm text-gray-700 mb-1 block">Title</Label>
            <Input
              placeholder="Summarise your experience…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div>
            <Label className="text-sm text-gray-700 mb-1 block">Review</Label>
            <Textarea
              placeholder="Tell others about your experience…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </Button>
        </div>

      </div>
    </div>
  );
}