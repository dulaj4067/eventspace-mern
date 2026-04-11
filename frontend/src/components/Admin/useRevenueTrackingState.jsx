import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:5000/api';

export function useRevenueTrackingState() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('monthly'); // 'monthly' | 'yearly' | 'all'

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch (err) {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Only completed payments count as revenue — refunded, failed, pending are excluded
  const completedPayments = useMemo(
    () => payments.filter((p) => p.paymentStatus === 'completed'),
    [payments]
  );

  // Build chart data based on filter
  const chartData = useMemo(() => {
    if (filter === 'monthly') {
      // Last 12 months
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          total: 0,
        });
      }
      for (const p of completedPayments) {
        const d = new Date(p.paidAt || p.createdAt);
        const slot = months.find(
          (m) => m.year === d.getFullYear() && m.month === d.getMonth()
        );
        if (slot) slot.total += p.amount;
      }
      return {
        labels: months.map((m) => m.label),
        values: months.map((m) => parseFloat(m.total.toFixed(2))),
      };
    }

    if (filter === 'yearly') {
      // Group by year
      const yearMap = {};
      for (const p of completedPayments) {
        const year = new Date(p.paidAt || p.createdAt).getFullYear();
        yearMap[year] = (yearMap[year] || 0) + p.amount;
      }
      const sorted = Object.keys(yearMap).sort();
      return {
        labels: sorted,
        values: sorted.map((y) => parseFloat(yearMap[y].toFixed(2))),
      };
    }

    // 'all' — group by month across all time
    const monthMap = {};
    for (const p of completedPayments) {
      const d = new Date(p.paidAt || p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + p.amount;
    }
    const sorted = Object.keys(monthMap).sort();
    return {
      labels: sorted,
      values: sorted.map((k) => parseFloat(monthMap[k].toFixed(2))),
    };
  }, [completedPayments, filter]);

  const summary = useMemo(() => {
    const total = completedPayments.reduce((s, p) => s + p.amount, 0);
    const venueTotal = completedPayments
      .filter((p) => p.paymentType === 'venue-booking')
      .reduce((s, p) => s + p.amount, 0);
    const eventTotal = completedPayments
      .filter((p) => p.paymentType === 'event-registration')
      .reduce((s, p) => s + p.amount, 0);
    const refundedTotal = payments
      .filter((p) => p.paymentStatus === 'refunded')
      .reduce((s, p) => s + (p.refundAmount ?? p.amount), 0);
    return {
      total: total.toFixed(2),
      venueTotal: venueTotal.toFixed(2),
      eventTotal: eventTotal.toFixed(2),
      refundedTotal: refundedTotal.toFixed(2),
      count: completedPayments.length,
    };
  }, [completedPayments, payments]);

  return { chartData, summary, filter, setFilter, loading, completedPayments };
}