import Stripe from 'stripe';
import Booking from '../Models/BookingModel.js';
import Availability from '../Models/Availability.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

// 🗓️ Fetch available slots
const availabilityRoutes = async (req, res) => {
  const { date } = req.query;

  try {
    const dayOfWeek = new Date(date).getDay();
    let startTime, endTime;

    switch (dayOfWeek) {
      case 1:
        return res.json([]); // Closed on Monday
      case 2:
      case 3:
      case 4:
      case 5:
        startTime = '10:30';
        endTime = '18:30';
        break;
      case 6:
      case 0:
        startTime = '11:00';
        endTime = '18:00';
        break;
      default:
        return res.json([]);
    }

    const generatedSlots = generateTimeSlots(startTime, endTime, 60);
    const availability = await Availability.findOne({ date });

    // ✅ No availability record → all slots available
    if (!availability) {
      return res.json(generatedSlots);
    }

    // ✅ Filter out only slots that are full (bookingsCount >= 2) or marked as leave
    const availableSlots = generatedSlots.filter((slotTime) => {
      const slot = availability.slots.find((s) => s.time === slotTime);

      // No record found → slot is free
      if (!slot) return true;

      // Only remove slot if it's full (2+ bookings) or marked as leave
      const isFull = slot.bookingsCount >= 2;
      return !isFull && !slot.isLeave;
    });

    res.json(availableSlots);
  } catch (err) {
    console.error('Error fetching availability:', err.message);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
};

// 🧾 Fetch all bookings
const bookingsRoutes = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ _id: -1 });
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// 💳 Handle payment + booking
const paymentsRoutes = async (req, res) => {
  const { customer, services, date, timeSlot, payment } = req.body;

  try {
    const availability = await Availability.findOne({ date });
    if (!availability) {
      return res.status(400).json({ error: 'No availability for this date' });
    }

    let slot = availability.slots.find((s) => s.time === timeSlot);
    if (!slot) {
      slot = { time: timeSlot, bookingsCount: 0, isBooked: false };
      availability.slots.push(slot);
    }

    if (slot.isLeave) {
      return res
        .status(400)
        .json({ error: 'Slot unavailable (leave applied)' });
    }

    if (slot.bookingsCount >= 2) {
      return res.status(400).json({ error: 'Slot already fully booked' });
    }

    if (payment.method === 'card') {
      const intent = await stripe.paymentIntents.retrieve(
        payment.paymentIntentId
      );
      if (intent.status !== 'succeeded') {
        return res.status(402).json({ error: 'Payment not completed' });
      }
    }

    // Create booking
    const booking = new Booking({
      customer,
      services,
      date,
      timeSlot,
      payment,
    });
    await booking.save();

    // Update availability slot count
    slot.bookingsCount += 1;
    slot.isBooked = slot.bookingsCount >= 2;

    await availability.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Booking failed:', err.message);
    res.status(500).json({ error: 'Booking failed' });
  }
};

// 📅 Create manual booking (admin/manual)
const createBooking = async (req, res) => {
  const payload = req.body;
  const services = payload.services;

  const bookingData = {
    services: services.map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      price: service.price,
      duration: service.duration,
    })),
    appointmentDate: new Date(payload.appointmentDate),
    appointmentTime: payload.appointmentTime,
    staffMember: '',
    customerDetails: payload.customerDetails,
    subtotal: services.reduce((sum, s) => sum + s.price, 0),
    depositPaid: 0,
    total: services.reduce((sum, s) => sum + s.price, 0),
    payment_status: 'pending',
    paymentMethod: 'Manual',
    confirmed: true,
  };

  try {
    const newBooking = new Booking(bookingData);
    const savedBooking = await newBooking.save();

    await updateAvailability(
      bookingData.appointmentDate,
      bookingData.appointmentTime
    );

    res.status(201).json({ message: 'Booking created', booking: savedBooking });
  } catch (err) {
    console.error('❌ Error saving booking:', err.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// 🔄 Update slot availability (add one booking)
const updateAvailability = async (appointmentDate, appointmentTime) => {
  const dateStr = appointmentDate.toISOString().split('T')[0];

  try {
    let availability = await Availability.findOne({ date: dateStr });
    if (!availability) {
      availability = new Availability({ date: dateStr, slots: [] });
    }

    let slot = availability.slots.find((s) => s.time === appointmentTime);
    if (!slot) {
      slot = { time: appointmentTime, bookingsCount: 0, isBooked: false };
      availability.slots.push(slot);
    }

    if (!slot.isLeave) {
      slot.bookingsCount += 1;
      if (slot.bookingsCount >= 2) slot.isBooked = true;
    }

    await availability.save();
    console.log(`✅ Availability updated for ${dateStr} at ${appointmentTime}`);
  } catch (err) {
    console.error('❌ Failed to update availability:', err.message);
  }
};

// 🚫 Leave update (block full day or specific slot)
export const leaveUpdate = async (req, res) => {
  try {
    const { date, time, fullDay } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required.' });

    const dateStr = new Date(date).toISOString().split('T')[0];
    const dayOfWeek = new Date(date).getDay();

    let startTime, endTime;
    switch (dayOfWeek) {
      case 1:
        return res.status(400).json({ error: 'Salon closed on Monday.' });
      case 2:
      case 3:
      case 4:
      case 5:
        startTime = '10:30';
        endTime = '18:30';
        break;
      case 6:
      case 0:
        startTime = '11:00';
        endTime = '18:00';
        break;
    }

    const allSlots = generateTimeSlots(startTime, endTime, 60);
    let availability = await Availability.findOne({ date: dateStr });
    if (!availability) {
      availability = new Availability({ date: dateStr, slots: [] });
    }

    if (true) {
      // 🕒 Apply leave (as one booking) to all slots of the day
      allSlots.forEach((slotTime) => {
        let slot = availability.slots.find((s) => s.time === slotTime);

        if (!slot) {
          availability.slots.push({
            time: slotTime,
            bookingsCount: 1, // leave counts as one booking
            isBooked: false,
          });
        } else {
          slot.bookingsCount = Math.min(slot.bookingsCount + 1, 2);
          slot.isBooked = slot.bookingsCount >= 2;
        }
      });
    } else if (time) {
      // 🕐 Apply leave to a specific time slot
      let slot = availability.slots.find((s) => s.time === time);
      if (!slot) {
        availability.slots.push({
          time,
          bookingsCount: 1,
          isBooked: false,
        });
      } else {
        slot.bookingsCount = Math.min(slot.bookingsCount + 1, 2);
        slot.isBooked = slot.bookingsCount >= 2;
      }
    } else {
      return res.status(400).json({ error: 'Please specify fullDay or time.' });
    }

    await availability.save();

    res.json({
      message: fullDay
        ? `Full-day leave applied (as one booking per slot) for ${dateStr}`
        : `Leave applied (as one booking) for ${dateStr} at ${time}`,
      updatedAvailability: availability,
    });
  } catch (error) {
    console.error('❌ Leave update failed:', error.message);
    res.status(500).json({ error: 'Failed to apply leave' });
  }
};

export default {
  availabilityRoutes,
  bookingsRoutes,
  paymentsRoutes,
  createBooking,
  leaveUpdate,
};
