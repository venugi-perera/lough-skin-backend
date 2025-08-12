import express from 'express';
import categoryController from '../controller/categoryController.js';

const CategoryRouter = express.Router();

// Get all services
CategoryRouter.get('/', categoryController.getAllCategories);

// Get service by ID
CategoryRouter.get('/:id', categoryController.getCategoryById);

// Create a new service
CategoryRouter.post('/', categoryController.createCategory);

// Update a service by ID
CategoryRouter.put('/:id', categoryController.updateCategory);

// Delete a service by ID
CategoryRouter.delete('/:id', categoryController.deleteCategory);

export default CategoryRouter;
