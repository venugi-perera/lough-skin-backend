import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEB_HOOK;

// Optional: function to handle booking logic without DB
const handleBooking = async (customer, session) => {
  const services = JSON.parse(customer.metadata.services);

  const bookingData = {
    userId: customer.metadata.userId,
    customerName: customer.metadata.customerName,
    customerEmail: customer.metadata.customerEmail,
    customerPhone: customer.metadata.customerPhone,
    appointmentDate: customer.metadata.appointmentDate,
    appointmentTime: customer.metadata.appointmentTime,
    staffMember: customer.metadata.staffMember,
    services: services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
    subtotal: services.reduce((sum, s) => sum + s.price, 0),
    depositPaid: session.amount_total / 100,
    total: services.reduce((sum, s) => sum + s.price, 0),
    payment_status: session.payment_status,
    paymentMethod: 'Stripe',
    confirmed: true,
  };

  console.log('📌 Booking data (no DB save):', bookingData);

  // Optional: send email or trigger other actions here
  // await sendBookingConfirmationEmail(customer.metadata.customerEmail, customer.metadata.customerName, bookingData);
};

router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  let data, eventType;

  if (webhookSecret) {
    const signature = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
      data = event.data.object;
      eventType = event.type;
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    data = req.body.data.object;
    eventType = req.body.type;
  }

  if (eventType === 'checkout.session.completed') {
    stripe.customers
      .retrieve(data.customer)
      .then((customer) => handleBooking(customer, data))
      .catch((err) =>
        console.error('❌ Failed to fetch customer:', err.message)
      );
  }

  res.status(200).end();
});

export default router;
