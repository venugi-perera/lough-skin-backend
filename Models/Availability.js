import mongoose from 'mongoose';

const AvailabilitySchema = new mongoose.Schema({
  date: String, // e.g. '2025-07-28'
  slots: [
    {
      time: String, // e.g. '10:00 AM'
      isBooked: Boolean,
    },
  ],
});

export default mongoose.model('Availability', AvailabilitySchema);
