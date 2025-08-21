import express from 'express';
import bookingModel from '../Models/BookingModel.js'; // updated model name
const router = express.Router(); // Mongoose model

// GET /api/booking-success?session_id=xyz
router.get('/booking-success', async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id in query' });
  }

  try {
    const booking = await bookingModel.findOne({
      checkoutSessionId: sessionId,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      depositPaid: booking.depositPaid,
      total: booking.total,
      bookingId: booking._id,
      customerName: booking.customerDetails.name,
      service: booking.services.map((s) => s.name).join(', '),
      time: `${booking.appointmentDate} at ${booking.appointmentTime}`,
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
