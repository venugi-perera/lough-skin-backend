import express from 'express';
import admin from '../controller/admin.js';
const AdminRouter = express.Router();

// BOOKING routes
AdminRouter.get('/bookings', admin.getAllBookings);
AdminRouter.get('/bookings/:id', admin.getBookingById);
AdminRouter.post('/bookings', admin.createBooking);
AdminRouter.patch('/bookings/:id/status', admin.updateBookingStatus);
AdminRouter.delete('/bookings/:id', admin.deleteBooking);

// AVAILABILITY routes
AdminRouter.get('/availability', admin.getAvailability);
AdminRouter.post('/availability', admin.createAvailability);
AdminRouter.patch('/availability/:date/slot', admin.updateSlotStatus);
AdminRouter.delete('/availability/:date', admin.deleteAvailability);

export default AdminRouter;
