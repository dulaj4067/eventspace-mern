import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  X, ChevronRight, Loader2, CheckCircle2, ShieldCheck,
  AlertCircle, Check, Upload, Trash2, CreditCard, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const injectFonts = () => {
  if (document.getElementById('payment-fonts')) return;
  const link = document.createElement('link');
  link.id = 'payment-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
};

const CARD_OPTS = {
  style: {
    base: { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
    invalid: { color: '#dc2626', iconColor: '#dc2626' },
  },
  hidePostalCode: true,
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'DM Sans, sans-serif',
};
const errStyle = { color: '#dc2626', fontSize: 11, marginTop: 4, fontFamily: 'DM Sans, sans-serif' };

const resolveUserId = (token) => {
  const stored = localStorage.getItem('userId');
  if (stored) return stored;
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    return p.id || p._id || p.userId || p.sub || null;
  } catch { return null; }
};

function BankSlipSection({ amount, slipFile, slipPreview, onFileChange, onRemove, fileInputRef }) {
  return (
    <div style={{ padding: '20px 28px 0' }}>
      <div style={{ border: '1.5px solid #dbeafe', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: '#1d4ed8', padding: '10px 16px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'DM Serif Display, serif' }}>Bank Transfer Details</span>
        </div>
        {[
          ['Bank', "People's Bank"],
          ['Account Name', 'Facility Management Ltd'],
          ['Account No.', '001-2345-6789-00'],
          ['Branch', 'Kandy Main'],
          ['Reference', `EVT-${Date.now().toString().slice(-6)}`],
          ['Amount', `$${amount.toFixed(2)}`],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 16px', borderBottom: i < arr.length - 1 ? '1px solid #eff6ff' : 'none',
            background: label === 'Amount' ? '#eff6ff' : '#fff',
          }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: label === 'Amount' ? 700 : 500, color: label === 'Amount' ? '#1d4ed8' : '#0f172a', fontFamily: label === 'Account No.' || label === 'Reference' ? 'monospace' : 'DM Sans, sans-serif' }}>{value}</span>
          </div>
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={onFileChange} />

      {slipFile && slipPreview ? (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #22c55e' }}>
          <img src={slipPreview} alt="slip" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)', display: 'flex', alignItems: 'flex-end', padding: 12, justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{slipFile.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{(slipFile.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={onRemove} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
              <Trash2 size={12} /> Remove
            </button>
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#22c55e', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={11} color="#fff" />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>Ready to submit</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f0f9ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ width: 50, height: 50, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Upload size={22} color="#64748b" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>Click to upload payment slip</div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}>JPG or PNG · max 8 MB</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginTop: 14 }}>
        <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12, color: '#92400e', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
          Your registration will be <strong>pending</strong> until an admin confirms your transfer.
        </span>
      </div>
    </div>
  );
}

function EventCheckoutForm({ eventId, eventName, amount, currency, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();

  const [tab, setTab] = useState('card');
  const [cardholderName, setCardholderName] = useState('');
  const [nameError, setNameError] = useState('');
  const [cardError, setCardError] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const fileInputRef = useRef(null);

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error('Please upload a JPG or PNG image.'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('File must be under 8 MB.'); return; }
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = ev => setSlipPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePay = async () => {
    setPaymentError('');
    if (tab === 'slip') {
      if (!slipFile) { setPaymentError('Please upload your bank transfer slip before submitting.'); return; }
      await handleBankSlip();
      return;
    }
    if (!stripe || !elements) { setPaymentError('Stripe has not loaded yet.'); return; }
    if (cardholderName.trim().length < 3) { setNameError('Enter the name as it appears on your card'); return; }
    if (cardError) { setPaymentError('Please fix the card details before proceeding.'); return; }
    await handleStripeCard();
  };

  const handleStripeCard = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You are not logged in.');
      const userId = resolveUserId(token);
      if (!userId) throw new Error('Unable to identify user. Please log in again.');

      // Step 1 — Create Stripe PaymentIntent for event
      const intentRes = await fetch('/api/payments/create-event-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, userId, amount, paymentMethod: 'card' }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.clientSecret) throw new Error(intentData.message || 'Failed to initialise payment.');

      const { clientSecret, paymentId } = intentData;

      // Step 2 — Confirm with Stripe.js
      const cardElement = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement, billing_details: { name: cardholderName.trim() } },
      });

      if (error) {
        await fetch(`/api/payments/${paymentId}/fail`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        throw new Error(error.message);
      }
      if (paymentIntent.status !== 'succeeded') throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);

      // Step 3 — Confirm on backend
      const confirmRes = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stripePaymentIntentId: paymentIntent.id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.message || 'Payment confirmed but registration failed. Contact support.');

      // Step 4 — Register the user for the event
      await completeRegistration(token, userId, paymentId);

    } catch (err) {
      setPaymentError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleBankSlip = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You are not logged in.');
      const userId = resolveUserId(token);
      if (!userId) throw new Error('Unable to identify user. Please log in again.');

      // Step 1 — Create pending payment record using the correct event-registration endpoint
      // FIX: was POST /api/payments (venue booking route) which requires bookingId, not eventId
      const paymentRes = await fetch('/api/payments/event-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId,
          userId,
          amount,
          paymentMethod: 'bank',
          // paymentType is set server-side by this endpoint — no need to send it
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(paymentData.message || 'Failed to create payment record.');

      const paymentId = paymentData.payment._id;

      // Step 2 — Upload slip
      const formData = new FormData();
      formData.append('bankSlip', slipFile);
      const uploadRes = await fetch(`/api/payments/${paymentId}/upload-slip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message || 'Slip upload failed. Please contact support.');

      // Step 3 — Register with pending payment status
      await completeRegistration(token, userId, paymentId);

    } catch (err) {
      setPaymentError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const completeRegistration = async (token, userId, paymentId) => {
    const regRes = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, paymentId }),
    });
    const regData = await regRes.json();
    // If "already registered" treat as success (idempotent)
    if (!regRes.ok && !regData.message?.includes('already registered')) {
      throw new Error(regData.message || 'Payment done but registration failed. Contact support with your payment ID.');
    }
    setSuccess(true);
    setTimeout(() => onSuccess(paymentId), 2200);
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: '26px 28px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <ShieldCheck size={13} color="#16a34a" />
            <span style={{ fontSize: 10, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Secure Checkout</span>
          </div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 23, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Event Registration</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '5px 0 0' }}>{eventName}</p>
        </div>
        {!processing && !success && (
          <button onClick={onClose} style={{ border: 'none', background: '#f4f4f5', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#374151" />
          </button>
        )}
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '60px 28px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: tab === 'slip' ? 'linear-gradient(135deg,#dbeafe,#bfdbfe)' : 'linear-gradient(135deg,#d1fae5,#a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: tab === 'slip' ? '0 8px 32px rgba(29,78,216,0.15)' : '0 8px 32px rgba(16,185,129,0.2)' }}>
            <CheckCircle2 size={38} color={tab === 'slip' ? '#1d4ed8' : '#059669'} />
          </div>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#0f172a', margin: '0 0 10px' }}>
            {tab === 'slip' ? 'Slip Submitted!' : 'Registration Confirmed!'}
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {tab === 'slip' ? (<>Your registration is <strong>pending admin approval</strong>.<br />We'll notify you once your transfer is confirmed.</>) : (<>You're registered! Redirecting…</>)}
          </p>
        </div>
      ) : (
        <>
          {/* Order summary */}
          <div style={{ margin: '20px 28px 0', background: '#f8faff', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '8px 16px', background: '#1d4ed8' }}>
              <span style={{ fontFamily: 'DM Serif Display, serif', color: '#fff', fontSize: 12, letterSpacing: '0.05em' }}>Registration Fee</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#475569' }}>Event entry fee</span>
              <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 20 }}>${amount.toFixed(2)} {currency?.toUpperCase()}</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ padding: '18px 28px 0' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, gap: 4 }}>
              {[{ key: 'card', icon: <CreditCard size={14} />, label: 'Card Payment' }, { key: 'slip', icon: <ImageIcon size={14} />, label: 'Bank Slip' }].map(({ key, icon, label }) => (
                <button key={key} onClick={() => { setTab(key); setPaymentError(''); setCardError(''); setNameError(''); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#1d4ed8' : '#64748b', boxShadow: tab === key ? '0 1px 6px rgba(0,0,0,0.09)' : 'none' }}>
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Card form */}
          {tab === 'card' && (
            <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={labelStyle}>Cardholder Name</label>
                <input style={{ fontFamily: 'DM Sans, sans-serif', background: '#fafafa', border: `1.5px solid ${nameError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#111', boxSizing: 'border-box' }}
                  placeholder="Name exactly as printed on card" value={cardholderName}
                  onChange={e => { setCardholderName(e.target.value); setNameError(''); }} />
                {nameError && <div style={errStyle}>{nameError}</div>}
              </div>
              <div>
                <label style={labelStyle}>Card Details</label>
                <div style={{ border: `1.5px solid ${cardError ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '13px 14px', background: '#fafafa' }}>
                  <CardElement options={CARD_OPTS} onChange={e => setCardError(e.error ? e.error.message : '')} />
                </div>
                {cardError && <div style={errStyle}>{cardError}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 8, padding: '9px 12px' }}>
                <ShieldCheck size={14} color="#16a34a" />
                <span style={{ fontSize: 12, color: '#15803d', fontFamily: 'DM Sans, sans-serif' }}>Secured by Stripe · Card details go directly to Stripe</span>
              </div>
            </div>
          )}

          {tab === 'slip' && (
            <BankSlipSection amount={amount} slipFile={slipFile} slipPreview={slipPreview} onFileChange={handleSlipChange} onRemove={() => { setSlipFile(null); setSlipPreview(null); }} fileInputRef={fileInputRef} />
          )}

          {paymentError && (
            <div style={{ margin: '16px 28px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#b91c1c', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>{paymentError}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <button onClick={handlePay} disabled={processing || (tab === 'card' && !stripe)}
              style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: processing || (tab === 'card' && !stripe) ? '#e2e8f0' : 'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%)', color: processing || (tab === 'card' && !stripe) ? '#94a3b8' : '#fff', fontSize: 15, fontWeight: 700, cursor: processing || (tab === 'card' && !stripe) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', boxShadow: processing || (tab === 'card' && !stripe) ? 'none' : '0 6px 24px rgba(29,78,216,0.32)', transition: 'all 0.2s' }}>
              {processing ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Processing…</> : <>{tab === 'card' ? `Pay $${amount.toFixed(2)}` : 'Submit Slip & Register'}<ChevronRight size={18} /></>}
            </button>
            <button onClick={onClose} disabled={processing} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', padding: '6px 0', fontFamily: 'DM Sans, sans-serif', opacity: processing ? 0.4 : 1 }}>
              Cancel — return to event
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export function EventPaymentModal({ isOpen, onClose, eventId, eventName, amount, currency, onSuccess }) {
  useEffect(() => { injectFonts(); }, []);

  // Guard: never render the payment modal for free events
  // amount could be 0 or undefined if a free event somehow triggers this
  if (!isOpen) return null;
  if (!amount || Number(amount) === 0) {
    console.warn('EventPaymentModal opened for a free event — this should not happen. Check EventDetail.handleRegister.');
    return null;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(8,8,20,0.65)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 468, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.28)', fontFamily: 'DM Sans, sans-serif' }}>
        <Elements stripe={stripePromise}>
          <EventCheckoutForm eventId={eventId} eventName={eventName} amount={amount} currency={currency} onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}