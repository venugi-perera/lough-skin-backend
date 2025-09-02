import express from 'express';
import Stripe from 'stripe';
import { sendBookingConfirmationEmail } from './sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

const currency = 'eur';

// Create Checkout Session for Service Booking
router.post('/create-payment-intent', async (req, res) => {
  const {
    userId,
    services,
    appointmentDate,
    appointmentTime,
    customerInfo,
    staffMember,
    notes,
  } = req.body;
  const { origin } = req.headers;

  try {
    // Create a Stripe customer with metadata for booking
    const customer = await stripe.customers.create({
      metadata: {
        email: customerInfo.email,
        userId,
        services: JSON.stringify(services),
        appointmentDate,
        appointmentTime,
        staffMember: staffMember || '',
        notes: notes || '',
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        paymentDate: new Date().toISOString(), // store payment creation date
      },
    });

    // Create Stripe line items from selected services
    const line_items = services.map((service) => {
      const depositAmount = Math.round(service.price * 0.3 * 100); // 30% in cents

      return {
        price_data: {
          currency,
          product_data: {
            name: service.name,
            description: `${service.duration} mins (30% deposit)`,
            metadata: {
              id: service.serviceId,
              fullPrice: service.price,
            },
          },
          unit_amount: depositAmount,
        },
        quantity: 1,
      };
    });

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      line_items,
      mode: 'payment',
      phone_number_collection: { enabled: true },
      invoice_creation: { enabled: true },
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking-cancelled`,
    });

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Stripe error', error: err.message });
  }
});

// Stripe Webhook
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEB_HOOK;
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
        console.error(
          `⚠️ Webhook signature verification failed: ${err.message}`
        );
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      data = req.body.data.object;
      eventType = req.body.type;
    }

    if (eventType === 'checkout.session.completed') {
      stripe.customers
        .retrieve(data.customer)
        .catch((err) =>
          console.error('❌ Failed to fetch customer:', err.message)
        );
    }

    res.status(200).end();
  }
);

export default router;
