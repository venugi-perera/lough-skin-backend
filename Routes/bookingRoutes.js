import express from 'express';

import blogController from '../controller/article.js';

const AuthRouter = express.Router();

AuthRouter.get('/availability', blogController.availabilityRoutes);
AuthRouter.get('/bookings', blogController.bookingsRoutes);
AuthRouter.put('/', blogController.paymentsRoutes);
// AuthRouter.delete('/blogs/:id', blogController.deleteBlog);

export default AuthRouter;
