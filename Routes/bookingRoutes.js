import express from 'express';

import blogController from '../controller/article.js';

const AuthRouter = express.Router();

AuthRouter.get('/availability', blogController.availabilityRoutes);
AuthRouter.get('/bookings', blogController.bookingsRoutes);
AuthRouter.put('/', blogController.paymentsRoutes);
AuthRouter.post('/bookings/manual', blogController.createBooking);
AuthRouter.post('/leaves/create', blogController.leaveUpdate);
// AuthRouter.delete('/blogs/:id', blogController.deleteBlog);

export default AuthRouter;
