import express from 'express';
import Stripe from 'stripe';
import bookingModel from '../Models/BookingModel.js'; // updated model name
import { sendBookingConfirmationEmail } from './sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

const currency = 'eur';
const deliveryCharge = 0; // optional for services

// Create Checkout Session for Service Booking
router.post('/create-payment-intent', async (req, res) => {
  const {
    userId,
    services,
    totalAmount,
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
      },
    });

    // Create Stripe line items from selected services
    const line_items = services.map((service) => ({
      price_data: {
        currency,
        product_data: {
          name: service.name,
          description: `${service.duration} mins`,
          metadata: {
            id: service.serviceId,
          },
        },
        unit_amount: service.price * 100,
      },
      quantity: 1,
    }));

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      line_items,
      mode: 'payment',
      phone_number_collection: {
        enabled: true,
      },
      invoice_creation: {
        enabled: true,
      },
      success_url: `/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `/booking-cancelled`,
    });

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Stripe error', error: err.message });
  }
});

// Create Booking in DB after payment
const createBooking = async (customer, session) => {
  const services = JSON.parse(customer.metadata.services);

  const bookingData = {
    userId: customer.metadata.userId,
    customerId: session.customer,
    checkoutSessionId: session.id, // ✅ Save the Stripe session ID
    paymentIntentId: session.payment_intent,
    services: services.map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      price: service.price,
      duration: service.duration,
    })),
    appointmentDate: new Date(customer.metadata.appointmentDate),
    appointmentTime: customer.metadata.appointmentTime,
    staffMember: customer.metadata.staffMember,
    customerDetails: {
      name: customer.metadata.customerName,
      email: customer.metadata.customerEmail,
      phone: customer.metadata.customerPhone,
      address: session.customer_details.address,
    },
    notes: customer.metadata.notes,
    subtotal: session.amount_subtotal,
    total: session.amount_total,
    payment_status: session.payment_status,
    paymentMethod: 'Stripe',
    confirmed: true,
  };

  try {
    const newBooking = new bookingModel(bookingData);
    const savedBooking = await newBooking.save();
    console.log('✅ Booking created:', savedBooking._id);

    await sendBookingConfirmationEmail(
      customer.metadata.customerEmail,
      customer.metadata.customerName,
      bookingData
    );
  } catch (err) {
    console.error('❌ Error saving booking:', err.message);
  }
};

// Stripe Webhook to handle booking after payment
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

    // Create booking when payment is successful
    if (eventType === 'checkout.session.completed') {
      stripe.customers
        .retrieve(data.customer)
        .then((customer) => createBooking(customer, data))
        .catch((err) =>
          console.error('❌ Failed to fetch customer:', err.message)
        );
    }

    res.status(200).end();
  }
);

export default router;
