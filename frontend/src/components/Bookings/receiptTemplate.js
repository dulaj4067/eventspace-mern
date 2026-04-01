// receiptTemplate.js
// ✅ ADDED: Separate file for the receipt HTML template.
// Called by downloadReceipt in useBookingsState.jsx

export function generateReceiptHTML(booking) {
  const facilityName = booking.facility?.name || 'Facility';
  const city = booking.facility?.location?.address?.city || '';
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const issuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const receiptNo = `RCP-${booking._id?.slice(-8).toUpperCase()}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt – ${receiptNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #1a1a2e;
      padding: 48px;
      max-width: 680px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #4f46e5;
    }
    .brand { font-size: 26px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
    .brand span { color: #7c3aed; }
    .receipt-meta { text-align: right; }
    .receipt-no { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
    .receipt-no strong { color: #1a1a2e; font-size: 15px; }
    .receipt-date { font-size: 12px; color: #9ca3af; }
    .status-badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 12px;
    }
    .facility-block { margin-bottom: 32px; }
    .facility-name { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .facility-sub { font-size: 14px; color: #6b7280; }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
    }
    .detail-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .detail-value { font-size: 14px; font-weight: 600; color: #1a1a2e; }
    .pricing-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .pricing-table td { padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .pricing-table td:last-child { text-align: right; }
    .pricing-table .label { color: #6b7280; }
    .pricing-table .total-row td {
      border-bottom: none;
      border-top: 2px solid #4f46e5;
      padding-top: 14px;
      font-weight: 700;
      font-size: 16px;
      color: #4f46e5;
    }
    .purpose-block {
      background: #f5f3ff;
      border-left: 4px solid #7c3aed;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 32px;
    }
    .purpose-block p { font-size: 14px; color: #4c1d95; }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.8;
    }
    @media print {
      body { padding: 24px; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Event<span>Space</span></div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Booking Confirmation Receipt</div>
    </div>
    <div class="receipt-meta">
      <div class="receipt-no">Receipt No: <strong>${receiptNo}</strong></div>
      <div class="receipt-date">Issued: ${issuedDate}</div>
    </div>
  </div>

  <div class="status-badge">✓ Confirmed</div>

  <div class="facility-block">
    <div class="section-title">Facility</div>
    <div class="facility-name">${facilityName}</div>
    ${city ? `<div class="facility-sub">📍 ${city}</div>` : ''}
  </div>

  <div class="section-title">Booking Details</div>
  <div class="details-grid">
    <div>
      <div class="detail-label">Date</div>
      <div class="detail-value">${bookingDate}</div>
    </div>
    <div>
      <div class="detail-label">Time</div>
      <div class="detail-value">${booking.startTime} – ${booking.endTime}</div>
    </div>
    <div>
      <div class="detail-label">Duration</div>
      <div class="detail-value">${booking.duration} hour${booking.duration !== 1 ? 's' : ''}</div>
    </div>
    <div>
      <div class="detail-label">Expected Attendees</div>
      <div class="detail-value">${booking.attendees?.expected ?? '—'}</div>
    </div>
  </div>

  ${booking.purpose ? `
  <div class="section-title">Purpose</div>
  <div class="purpose-block">
    <p>${booking.purpose}</p>
  </div>` : ''}

  <div class="section-title">Pricing</div>
  <table class="pricing-table">
    <tr>
      <td class="label">Hourly Rate</td>
      <td>$${booking.pricing?.hourlyRate?.toFixed(2)}</td>
    </tr>
    <tr>
      <td class="label">Subtotal (${booking.duration}h)</td>
      <td>$${booking.pricing?.subtotal?.toFixed(2)}</td>
    </tr>
    ${booking.pricing?.serviceFee ? `
    <tr>
      <td class="label">Service Fee</td>
      <td>$${booking.pricing.serviceFee.toFixed(2)}</td>
    </tr>` : ''}
    ${booking.pricing?.discount ? `
    <tr>
      <td class="label">Discount</td>
      <td>– $${booking.pricing.discount.toFixed(2)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td>Total Paid</td>
      <td>$${booking.pricing?.total?.toFixed(2)}</td>
    </tr>
  </table>

  <div class="footer">
    <p>Thank you for booking with EventSpace!</p>
    <p>For support, contact us at info@eventspace.com · (555) 123-4567</p>
    <p style="margin-top:8px;font-size:11px;">This is an official booking receipt. Please retain for your records.</p>
  </div>
</body>
</html>`;
}