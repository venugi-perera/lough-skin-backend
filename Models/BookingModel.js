import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      required: true,
    },
    name: String,
    price: Number,
    duration: String, // in minutes
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String, // Stripe Customer ID
    },
    checkoutSessionId: {
      type: String, // ✅ Stripe Checkout Session ID
      required: true,
      unique: true,
    },
    paymentIntentId: {
      type: String,
    },
    services: [serviceSchema],
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String, // e.g., "3:30 PM"
      required: true,
    },
    staffMember: {
      type: String, // Optional: assign staff/employee
    },
    customerDetails: {
      name: String,
      email: String,
      phone: String,
      address: {
        line1: String,
        line2: String,
        city: String,
        postal_code: String,
        state: String,
        country: String,
      },
    },
    notes: {
      type: String,
    },

    // 💰 Payment details
    subtotal: Number, // total of all services before deposit
    total: Number, // total full amount (100%)
    depositPaid: { type: Number, required: false }, // 30% deposit actually paid
    remainingBalance: Number, // 70% due later

    payment_status: {
      type: String,
      enum: ['paid', 'unpaid', 'pending', 'deposit-paid'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      default: 'Stripe',
    },

    confirmed: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    dateCreated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
