import express from 'express';
// import bookingModel from '../Models/BookingModel.js'; // updated model name
const router = express.Router(); // Mongoose model

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// GET /api/booking-success?session_id=xyz
// router.get('/booking-success', async (req, res) => {
//   // const { id } = req.params;

//   // if (!id) {
//   //   return res.status(400).json({ error: 'PaymentIntent ID is required' });
//   // }

//   try {
//     const { session_id } = req.query; // from ?session_id=...

//     if (!session_id)
//       return res.status(400).json({ error: 'Session ID is required' });

//     // Retrieve the Checkout Session
//     const session = await stripe.checkout.sessions.retrieve(session_id);

//     // Get the Payment Intent ID
//     const paymentIntentId = session.payment_intent;

//     // Optionally, retrieve the Payment Intent object
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     res.status(200).json({ paymentIntentId, paymentIntent });
//   } catch (err) {
//     console.error('❌ Error retrieving PaymentIntent:', err.message);
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
//   // const sessionId = req.query.session_id;
//   // if (!sessionId) {
//   //   return res.status(400).json({ error: 'Missing session_id in query' });
//   // }
//   // try {
//   //   const booking = await bookingModel.findOne({
//   //     checkoutSessionId: sessionId,
//   //   });
//   //   if (!booking) {
//   //     return res.status(404).json({ error: 'Booking not found' });
//   //   }
//   //   res.json({
//   //     depositPaid: booking.depositPaid,
//   //     total: booking.total,
//   //     bookingId: booking._id,
//   //     customerName: booking.customerDetails.name,
//   //     service: booking.services.map((s) => s.name).join(', '),
//   //     time: `${booking.appointmentDate} at ${booking.appointmentTime}`,
//   //   });
//   // } catch (error) {
//   //   console.error('Error fetching booking details:', error);
//   //   res.status(500).json({ error: 'Internal server error' });
//   // }
// });

router.get('/booking-success', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id)
      return res.status(400).json({ error: 'Session ID is required' });

    // Retrieve the checkout session with expanded line items and products
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items.data.price.product', 'customer'],
    });

    const customerMetadata = session.customer.metadata; // ✅ this contains your booking info

    // Retrieve the checkout session with expanded line items and products
    const lineItems = session.line_items.data.map((item) => ({
      name: item.price.product.name,
      metadata: item.price.product.metadata, // ✅ product_data metadata
      quantity: item.quantity,
      unit_amount: item.price.unit_amount,
    }));

    let totalPaid = 0;
    let totalFullPrice = 0;

    lineItems.forEach((item) => {
      const quantity = item.quantity || 1;

      // unit_amount is in cents, divide by 100 for dollars/euros
      totalPaid += (item.unit_amount / 100) * quantity;

      // fullPrice may be string, convert to number
      totalFullPrice += (Number(item.metadata.fullPrice) || 0) * quantity;
    });

    res.status(200).json({
      success: true,
      depositPaid: totalPaid,
      total: totalFullPrice,
      session,
      paymentIntent: session.payment_intent,
      date: customerMetadata?.paymentDate,
    });
  } catch (err) {
    console.error('❌ Error retrieving session:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
