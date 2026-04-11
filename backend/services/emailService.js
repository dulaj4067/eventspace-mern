const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('[emailService] SENDGRID_API_KEY is missing. Emails will not be sent.');
}

exports.sendRegistrationConfirmation = async (userEmail, userName, eventName, eventDate) => {
  const msg = {
    to: userEmail,
    from: process.env.SENDER_EMAIL,
    subject: `Registration Confirmed: ${eventName}`,
    html: `
      <h2>Hi ${userName},</h2>
      <p>You have successfully registered for <strong>${eventName}</strong>.</p>
      <p><strong>Date:</strong> ${new Date(eventDate).toDateString()}</p>
      <p>See you there!</p>
    `
  };
  await sgMail.send(msg);
};

exports.sendCancellationNotice = async (userEmail, userName, eventName) => {
  const msg = {
    to: userEmail,
    from: process.env.SENDER_EMAIL,
    subject: `Event Cancelled: ${eventName}`,
    html: `
      <h2>Hi ${userName},</h2>
      <p>Unfortunately, <strong>${eventName}</strong> has been cancelled.</p>
      <p>We apologize for the inconvenience.</p>
    `
  };
  await sgMail.send(msg);
};