import { useState, useMemo } from 'react';
import { CreditCard, Trash2, Search, X, ImageIcon, ZoomIn } from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  failed:    'bg-red-100 text-red-700',
  refunded:  'bg-orange-100 text-orange-700',
};

const TYPE_STYLES = {
  'venue-booking':      'bg-blue-100 text-blue-700',
  'event-registration': 'bg-purple-100 text-purple-700',
};

const ALL_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

export function AdminPaymentsTab({ payments, loading, onDelete, onUpdateStatus }) {
  const [refundModal, setRefundModal]   = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [slipModal, setSlipModal]       = useState(null); // holds bankSlipUrl string

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  const handleStatusChange = (paymentId, currentStatus, newStatus) => {
    if (newStatus === 'refunded') {
      if (currentStatus !== 'completed') {
        alert('Only completed payments can be refunded.');
        return;
      }
      setRefundModal({ paymentId });
      setRefundReason('');
    } else {
      onUpdateStatus(paymentId, newStatus);
    }
  };

  const confirmRefund = () => {
    if (!refundReason.trim()) {
      alert('Please enter a refund reason.');
      return;
    }
    onUpdateStatus(refundModal.paymentId, 'refunded', refundReason);
    setRefundModal(null);
    setRefundReason('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo;

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (searchQuery) {
        const q     = searchQuery.toLowerCase();
        const name  = payment.userId?.name?.toLowerCase()  ?? '';
        const email = payment.userId?.email?.toLowerCase() ?? '';
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (statusFilter !== 'all' && payment.paymentStatus !== statusFilter) return false;
      if (typeFilter   !== 'all' && payment.paymentType   !== typeFilter)   return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(payment.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(payment.createdAt) > to) return false;
      }
      return true;
    });
  }, [payments, searchQuery, statusFilter, typeFilter, dateFrom, dateTo]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Loading payments...</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl">Manage Payments</h2>
              <p className="text-gray-600">Review and process all payments</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* ── Filters ──────────────────────────────────────────────────────── */}
          <div className="bg-gray-50 border rounded-lg p-4 mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Types</option>
                <option value="venue-booking">🏢 Venue Booking</option>
                <option value="event-registration">🎟 Event Registration</option>
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Showing {filteredPayments.length} of {payments.length} payments
            </p>
          </div>

          {/* ── Payments list ─────────────────────────────────────────────────── */}
          {filteredPayments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {hasActiveFilters ? 'No payments match your filters.' : 'No payments found.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment._id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

                    {/* ── Left: Info ─────────────────────────────────────────── */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TYPE_STYLES[payment.paymentType] ?? 'bg-gray-100 text-gray-700'}>
                          {payment.paymentType === 'venue-booking' ? '🏢 Venue Booking' : '🎟 Event Registration'}
                        </Badge>
                        <Badge className={STATUS_STYLES[payment.paymentStatus] ?? 'bg-gray-100 text-gray-700'}>
                          {payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)}
                        </Badge>
                        {payment.paymentMethod === 'bank' && (
                          <Badge className="bg-indigo-100 text-indigo-700">🏦 Bank Transfer</Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-700 space-y-1">
                        <p>
                          <strong>User:</strong>{' '}
                          {payment.userId?.name ?? 'Unknown'} ({payment.userId?.email ?? '—'})
                        </p>
                        {payment.paymentType === 'venue-booking' && payment.bookingId && (
                          <p>
                            <strong>Booking:</strong> {payment.bookingId.purpose} —{' '}
                            {new Date(payment.bookingId.date).toLocaleDateString()}
                          </p>
                        )}
                        {payment.paymentType === 'event-registration' && payment.eventId && (
                          <p><strong>Event:</strong> {payment.eventId.name}</p>
                        )}
                        <p><strong>Method:</strong> {payment.paymentMethod}</p>
                        {payment.transactionId && (
                          <p className="text-xs text-gray-400">
                            <strong>Transaction:</strong> {payment.transactionId}
                          </p>
                        )}
                        {payment.paymentStatus === 'refunded' && (
                          <p className="text-xs text-orange-600">
                            <strong>Refunded:</strong>{' '}
                            {payment.refundedAt ? new Date(payment.refundedAt).toLocaleDateString() : '—'}
                            {payment.refundReason ? ` — ${payment.refundReason}` : ''}
                          </p>
                        )}
                      </div>

                      {/* ── Bank slip section ─────────────────────────────────── */}
                      {payment.paymentMethod === 'bank' && (
                        <div className="mt-3">
                          {payment.bankSlipUrl ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSlipModal(payment.bankSlipUrl)}
                                className="relative group w-20 h-14 rounded-lg overflow-hidden border-2 border-indigo-200 hover:border-indigo-400 transition-colors flex-shrink-0"
                                title="View full slip"
                              >
                                <img
                                  src={payment.bankSlipUrl}
                                  alt="Bank slip"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="w-5 h-5 text-white" />
                                </div>
                              </button>
                              <div>
                                <p className="text-xs font-semibold text-indigo-700">Bank Slip Uploaded</p>
                                <button
                                  onClick={() => setSlipModal(payment.bankSlipUrl)}
                                  className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                                >
                                  View full image
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                              <ImageIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              <p className="text-xs text-yellow-700">
                                <strong>No slip uploaded.</strong> User has not submitted a payment slip yet.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Right: Amount + Actions ────────────────────────────── */}
                    <div className="flex flex-col items-end gap-2">
                      <p className={`text-2xl font-semibold ${
                        payment.paymentStatus === 'refunded'  ? 'text-orange-500 line-through' :
                        payment.paymentStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>

                      <select
                        value={payment.paymentStatus}
                        onChange={(e) =>
                          handleStatusChange(payment._id, payment.paymentStatus, e.target.value)
                        }
                        className="text-sm border rounded px-2 py-1 bg-white text-gray-700 cursor-pointer"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(payment._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bank Slip Lightbox ─────────────────────────────────────────────────── */}
      {slipModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSlipModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">Bank Transfer Slip</span>
              </div>
              <button
                onClick={() => setSlipModal(null)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Image */}
            <div className="bg-gray-100 flex items-center justify-center p-4 max-h-[75vh] overflow-auto">
              <img
                src={slipModal}
                alt="Bank transfer slip"
                className="max-w-full rounded-lg shadow"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Reason Modal ───────────────────────────────────────────────── */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Refund</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will mark the payment as refunded and remove it from revenue reporting. Please provide a reason.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              rows={3}
              placeholder="Refund reason (e.g. customer request, event cancelled...)"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <Button variant="outline" onClick={() => setRefundModal(null)}>Cancel</Button>
              <Button onClick={confirmRefund} className="bg-orange-500 hover:bg-orange-600 text-white">
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}