// bookingController.js
import Booking from '../Models/BookingModel.js';
import Availability from '../Models/Availability.js';

// GET all bookings (with filters)
async function getAllBookings(req, res) {
  try {
    const { date, status, customerName } = req.query;
    const filter = {};

    if (date) {
      filter.appointmentDate = new Date(date);
    }
    if (status) {
      if (status === 'confirmed') filter.confirmed = true;
      if (status === 'completed') filter.completed = true;
      if (status === 'pending') filter.confirmed = false;
    }
    if (customerName) {
      filter['customerDetails.name'] = { $regex: customerName, $options: 'i' };
    }

    const bookings = await Booking.find(filter).sort({
      appointmentDate: 1,
      appointmentTime: 1,
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET a single booking
async function getBookingById(req, res) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE a booking
async function createBooking(req, res) {
  try {
    const newBooking = new Booking(req.body);
    const savedBooking = await newBooking.save();

    // Mark slot as booked
    await Availability.updateOne(
      {
        date: req.body.appointmentDate,
        'slots.time': req.body.appointmentTime,
      },
      { $set: { 'slots.$.isBooked': true } }
    );

    res.status(201).json(savedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// UPDATE booking status
async function updateBookingStatus(req, res) {
  try {
    const { confirmed, completed } = req.body;
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { confirmed, completed },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Booking not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE booking
async function deleteBooking(req, res) {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Free the slot
    await Availability.updateOne(
      { date: booking.appointmentDate, 'slots.time': booking.appointmentTime },
      { $set: { 'slots.$.isBooked': false } }
    );

    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET availability for a date
async function getAvailability(req, res) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const availability = await Availability.findOne({ date });
    res.json(availability || { date, slots: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CREATE availability for a date
async function createAvailability(req, res) {
  try {
    const availability = new Availability(req.body);
    const saved = await availability.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// UPDATE a slot's booking status
async function updateSlotStatus(req, res) {
  try {
    const { time, isBooked } = req.body;
    const updated = await Availability.updateOne(
      { date: req.params.date, 'slots.time': time },
      { $set: { 'slots.$.isBooked': isBooked } }
    );

    if (updated.modifiedCount === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    res.json({ message: 'Slot updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE availability for a date
async function deleteAvailability(req, res) {
  try {
    const deleted = await Availability.findOneAndDelete({
      date: req.params.date,
    });
    if (!deleted)
      return res.status(404).json({ message: 'Availability not found' });
    res.json({ message: 'Availability deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export all in a single object
export default {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  getAvailability,
  createAvailability,
  updateSlotStatus,
  deleteAvailability,
};
