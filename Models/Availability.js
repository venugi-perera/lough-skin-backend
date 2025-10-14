import mongoose from 'mongoose';

const SlotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  bookingsCount: { type: Number, default: 0 },
});

const AvailabilitySchema = new mongoose.Schema({
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  slots: [SlotSchema],
});

export default mongoose.model('Availability', AvailabilitySchema);
