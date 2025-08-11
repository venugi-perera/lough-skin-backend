import express from 'express';
import serviceController from '../controller/serviceController.js';

const ServiceRouter = express.Router();

// Get all services
ServiceRouter.get('/', serviceController.getAllServices);

// Get service by ID
ServiceRouter.get('/:id', serviceController.getServiceById);

// Create a new service
ServiceRouter.post('/', serviceController.createService);

// Update a service by ID
ServiceRouter.put('/:id', serviceController.updateService);

// Delete a service by ID
ServiceRouter.delete('/:id', serviceController.deleteService);

export default ServiceRouter;
