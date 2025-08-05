import mongoose from 'mongoose';

const BookingSchemaCopy = new mongoose.Schema({
  customer: {
    name: String,
    email: String,
    phone: String,
    address: String,
    notes: String,
  },
  services: [
    {
      id: String,
      name: String,
      duration: Number,
      price: Number,
      quantity: Number,
    },
  ],
  date: String, // e.g. '2025-07-28'
  timeSlot: String, // e.g. '10:00 AM'
  payment: {
    method: String,
    status: String,
    paymentIntentId: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('BookingSchemaCopy', BookingSchemaCopy);
