import express from 'express';
import Stripe from 'stripe';
import bookingModel from '../Models/BookingModel.js'; // updated model name
import Availability from '../Models/Availability.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEB_HOOK;

const updateAvailability = async (appointmentDate, appointmentTime) => {
  const dateStr = appointmentDate.toISOString().split('T')[0];

  try {
    const availability = await Availability.findOne({ date: dateStr });

    if (availability) {
      const existingSlot = availability.slots.find(
        (slot) => slot.time === appointmentTime
      );

      if (!existingSlot) {
        availability.slots.push({ time: appointmentTime, isBooked: true });
      }

      await availability.save();
    } else {
      const newAvailability = new Availability({
        date: dateStr,
        slots: [{ time: appointmentTime, isBooked: true }],
      });

      await newAvailability.save();
    }

    console.log(`🗓️ Availability updated for ${dateStr} at ${appointmentTime}`);
  } catch (err) {
    console.error('❌ Failed to update availability:', err.message);
  }
};

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
    subtotal: session.amount_subtotal / 100, // convert cents/pence → € / £
    total: session.amount_total / 100,
    payment_status: session.payment_status,
    paymentMethod: 'Stripe',
    confirmed: true,
  };

  try {
    const newBooking = new bookingModel(bookingData);
    const savedBooking = await newBooking.save();
    console.log('✅ Booking created:', savedBooking._id);

    // 🔄 Update availability table
    await updateAvailability(
      bookingData.appointmentDate,
      bookingData.appointmentTime
    );

    // await sendBookingConfirmationEmail(
    //   customer.metadata.customerEmail,
    //   customer.metadata.customerName,
    //   bookingData
    // );
  } catch (err) {
    console.error('❌ Error saving booking:', err.message);
  }
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
      .then((customer) => createBooking(customer, data))
      .catch((err) =>
        console.error('❌ Failed to fetch customer:', err.message)
      );
  }

  res.status(200).end();
});

export default router;
