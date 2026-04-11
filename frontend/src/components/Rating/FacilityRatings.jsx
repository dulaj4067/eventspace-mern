// FacilityRatings.jsx
// Displays ratings summary and all reviews for a facility.
// Review submission is now done from My Bookings page via ReviewModal.
// This component is read-only — no submit form here.

import { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';

// ── Star renderer ─────────────────────────────────────────────────────────────
function StarRow({ value, max = 5, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

// ── Rating bar row ────────────────────────────────────────────────────────────
function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-gray-500 text-right">{label}</span>
      <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-gray-400">{count}</span>
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const name = review.user?.name || 'Anonymous';
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="border border-gray-100 rounded-xl p-5 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar with user initials */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{name}</span>
            <StarRow value={review.rating} size={13} />
            <span className="text-xs text-gray-400 ml-auto">{date}</span>
          </div>
          {review.title && (
            <p className="text-sm font-medium text-gray-800 mt-1">{review.title}</p>
          )}
        </div>
      </div>

      {/* Review comment */}
      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed pl-12">{review.comment}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function FacilityRatings({ facilityId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/api/ratings/facility/${facilityId}`);
      const payload = await res.json();
      if (res.ok && payload.success) setData(payload.data);
    } catch {
      // silent — section just won't show reviews
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading reviews…</div>;
  }

  const { ratings = [], summary = { total: 0, average: 0, distribution: {} } } = data || {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Reviews{' '}
          {summary.total > 0 && (
            <span className="text-gray-400 font-normal">({summary.total})</span>
          )}
        </h3>
      </div>

      {/* Summary bar */}
      {summary.total > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex gap-8 items-center flex-wrap">
          <div className="text-center min-w-[72px]">
            <div className="text-4xl font-bold text-gray-900">{summary.average}</div>
            <StarRow value={Math.round(summary.average)} size={14} />
            <div className="text-xs text-gray-400 mt-1">
              {summary.total} review{summary.total !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <RatingBar
                key={n}
                label={n}
                count={summary.distribution[n] || 0}
                total={summary.total}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {ratings.length > 0 ? (
        <div className="space-y-3">
          {ratings.map((r) => (
            <ReviewCard key={r._id} review={r} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-400">
          <Star size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm">No reviews yet. Book this facility to leave a review!</p>
        </div>
      )}

    </div>
  );
}