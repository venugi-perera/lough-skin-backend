// models/Service.js
import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number, // duration in minutes
      required: true,
      min: 1,
    },
    price: {
      type: Number, // price in USD or your currency
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields
  }
);

const Service = mongoose.model('Service', serviceSchema);

export default Service;
