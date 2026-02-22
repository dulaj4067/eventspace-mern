import { useLocation } from 'react-router';
import { Payment } from './Payment.jsx';

export function PaymentPage() {
  const location = useLocation();
  const { amount = 100, bookingDetails = {
    facilityName: 'Community Facility',
    date: new Date().toLocaleDateString(),
    time: '10:00 AM - 12:00 PM'
  } } = location.state || {};

  return <Payment amount={amount} bookingDetails={bookingDetails} />;
}
