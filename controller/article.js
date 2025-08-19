import Stripe from 'stripe';
import Booking from '../Models/BookingModel.js';
import Availability from '../Models/Availability.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const availabilityRoutes = async (req, res) => {
  const { date } = req.query;

  try {
    const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let startTime, endTime;

    // Handle closed days
    switch (dayOfWeek) {
      case 1: // Monday
        return res.json([]); // Closed
      case 2:
      case 3:
      case 4:
      case 5:
        startTime = '10:30';
        endTime = '18:30';
        break;
      case 6: // Saturday
      case 0: // Sunday
        startTime = '11:00';
        endTime = '18:00';
        break;
      default:
        return res.json([]);
    }

    const generatedSlots = generateTimeSlots(startTime, endTime, 60);

    // Check if availability record exists for the date
    const availability = await Availability.findOne({ date });

    if (!availability) {
      // No record → all generated slots are available
      return res.json(generatedSlots);
    }

    // Filter out fully booked slots (2 or more bookings for a slot)
    const availableSlots = generatedSlots.filter((slotTime) => {
      const slot = availability.slots.find((s) => s.time === slotTime);
      if (!slot) return true; // Slot not yet booked
      return !slot.isBooked; // Only show slots not marked booked
    });

    res.json(availableSlots);
  } catch (err) {
    console.error('Error fetching availability:', err.message);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
};

// 🕒 Generate hourly time slots
function generateTimeSlots(start, end, interval) {
  const slots = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let current = new Date();
  current.setHours(startHour, startMin, 0, 0);

  const endTime = new Date();
  endTime.setHours(endHour, endMin, 0, 0);

  while (current < endTime) {
    const hour = current.getHours();
    const minute = current.getMinutes();
    const formatted = formatTime(hour, minute);
    slots.push(formatted);
    current.setMinutes(current.getMinutes() + interval);
  }

  return slots;
}

// ⏱️ Format time as 'HH:MM AM/PM'
function formatTime(hour, minute) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hr = hour % 12 || 12;
  const min = minute.toString().padStart(2, '0');
  return `${hr}:${min} ${ampm}`;
}

const bookingsRoutes = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ _id: -1 });
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

const paymentsRoutes = async (req, res) => {
  const { customer, services, date, timeSlot, payment } = req.body;

  try {
    const availability = await Availability.findOne({ date });
    if (!availability)
      return res.status(400).json({ error: 'No availability for this date' });

    const slot = availability.slots.find((s) => s.time === timeSlot);
    if (!slot || slot.isBooked)
      return res.status(400).json({ error: 'Time slot already booked' });

    if (payment.method === 'card') {
      const intent = await stripe.paymentIntents.retrieve(
        payment.paymentIntentId
      );
      if (intent.status !== 'succeeded') {
        return res.status(402).json({ error: 'Payment not completed' });
      }
    }

    const booking = new Booking({
      customer,
      services,
      date,
      timeSlot,
      payment,
    });
    await booking.save();

    slot.isBooked = true;
    await availability.save();

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: 'Booking failed' });
  }
};

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

const createBooking = async (req) => {
  const payload = req.body;
  const services = payload.services;

  const bookingData = {
    userId: '',
    customerId: '',
    checkoutSessionId: '',
    paymentIntentId: '',
    services: services.map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      price: service.price, // full service price
      duration: service.duration,
    })),
    appointmentDate: new Date(payload.appointmentDate),
    appointmentTime: payload.appointmentTime,
    staffMember: '',
    customerDetails: {
      name: payload.customerDetails.name,
      email: payload.customerDetails.email,
      phone: payload.customerDetails.phone,
      address: payload.customerDetails.address,
    },
    notes: payload.customerDetails.notes,
    subtotal: services.reduce((sum, s) => sum + s.price, 0), // full subtotal
    depositPaid: 0, // 30% actually paid
    total: services.reduce((sum, s) => sum + s.price, 0), // full amount
    payment_status: 'pending',
    paymentMethod: 'Manual',
    confirmed: true,
  };

  try {
    const newBooking = new Booking(bookingData);
    const savedBooking = await newBooking.save();
    console.log('✅ Booking created:', savedBooking._id);

    // 🔄 Update availability table
    await updateAvailability(
      bookingData.appointmentDate,
      bookingData.appointmentTime
    );
  } catch (err) {
    console.error('❌ Error saving booking:', err.message);
  }
};

export default {
  availabilityRoutes,
  bookingsRoutes,
  paymentsRoutes,
  createBooking,
};
