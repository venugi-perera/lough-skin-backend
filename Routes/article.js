import express from 'express';

import blogController from '../controller/article.js';

const AuthRouter = express.Router();

AuthRouter.post('/blogs', blogController.generateBlog);
AuthRouter.get('/blogs', blogController.getAllBlogs);
AuthRouter.put('/blogs/:id', blogController.editBlog);
AuthRouter.delete('/blogs/:id', blogController.deleteBlog);

export default AuthRouter;
