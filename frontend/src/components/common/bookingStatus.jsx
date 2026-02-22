const BOOKING_STATUS_STYLES = {
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function getBookingStatusClassName(status) {
  return BOOKING_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getBookingStatusLabel(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

