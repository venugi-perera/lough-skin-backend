import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendBookingConfirmationEmail = async (to, name, booking) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL, // verified sender email
    subject: 'Your Salon Booking Confirmation',
    html: `
      <h2>Hi ${name},</h2>
      <p>Thank you for booking with us. Here are your booking details:</p>
      <ul>
        <li><strong>Date:</strong> ${booking.appointmentDate}</li>
        <li><strong>Time:</strong> ${booking.appointmentTime}</li>
        <li><strong>Services:</strong> ${booking.services.map((s) => s.name).join(', ')}</li>
        <li><strong>Total Paid:</strong> €${(booking.total / 100).toFixed(2)}</li>
      </ul>
      <p>We look forward to seeing you!</p>
      <p>— Your Salon Team</p>
    `,
  };

  await sgMail.send(msg);
};
