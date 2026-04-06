/** Bump version when terms change so consent can be re-requested if needed */
export const TERMS_VERSION = '1';

export const TERMS_TITLE = 'EventSpace Terms of Service';

export const TERMS_SECTIONS = [
  {
    heading: '1. Acceptance',
    body: `By accessing or using EventSpace ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use certain features such as listing facilities or making bookings.`,
  },
  {
    heading: '2. Accounts & eligibility',
    body: `You must provide accurate registration information and keep your credentials secure. You are responsible for activity under your account. You must be legally able to enter into contracts in your jurisdiction to use paid features or list venues.`,
  },
  {
    heading: '3. Facility listings',
    body: `Listings must describe real spaces you are authorized to offer. Misleading descriptions, unsafe conditions, or illegal use are prohibited. We may remove or reject listings that violate these terms or applicable law.`,
  },
  {
    heading: '4. Admin review',
    body: `New and materially updated facility listings may be reviewed by administrators before appearing publicly. We may approve, request changes, or reject listings at our reasonable discretion.`,
  },
  {
    heading: '5. Bookings & payments',
    body: `Bookings are between users and facility owners subject to our booking rules and any payment provider terms. Fees, cancellations, and disputes are handled as described in our booking and payment policies.`,
  },
  {
    heading: '6. Content & intellectual property',
    body: `You retain rights to content you upload but grant us a license to host, display, and promote it in connection with the Service. Do not upload content you do not have rights to use.`,
  },
  {
    heading: '7. Limitation of liability',
    body: `The Service is provided "as is." To the fullest extent permitted by law, we disclaim warranties and limit liability for indirect or consequential damages arising from your use of the platform.`,
  },
  {
    heading: '8. Changes',
    body: `We may update these terms. Continued use after changes constitutes acceptance of the revised terms where permitted by law. Material changes may require renewed acknowledgment.`,
  },
];

export function getTermsPlainText() {
  return TERMS_SECTIONS.map((s) => `${s.heading}\n\n${s.body}`).join('\n\n');
}
