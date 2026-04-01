import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:5000/api';

export function useAdminPaymentsState() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Manually update payment status (admin override)
  const updateStatus = useCallback(async (paymentId, newStatus, refundReason = '') => {
    try {
      const token = localStorage.getItem('token');
      const body = { paymentStatus: newStatus };
      if (refundReason) body.refundReason = refundReason;

      const res = await fetch(`${API_BASE}/payments/${paymentId}/status`, { // ✅ fixed: added /status
        method: 'PUT',                                                        // ✅ fixed: PATCH → PUT
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Payment marked as ${newStatus}`);
      fetchPayments();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  }, [fetchPayments]);

  // Process via Stripe
  const processPayment = useCallback(async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments/${paymentId}/process-stripe`, { // ✅ fixed: /stripe → /process-stripe
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Payment processed successfully');
      fetchPayments();
    } catch (err) {
      toast.error(err.message || 'Failed to process payment');
    }
  }, [fetchPayments]);

  const deletePayment = useCallback(async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Payment deleted');
      fetchPayments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  }, [fetchPayments]);

  return { payments, loading, updateStatus, processPayment, deletePayment };
}