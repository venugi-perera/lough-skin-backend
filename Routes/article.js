import express from 'express';

import blogController from '../controller/article.js';

const AuthRouter = express.Router();

AuthRouter.post('/generate-blog', blogController.generateBlog);
AuthRouter.get('/blogs', blogController.getAllBlogs);

export default AuthRouter;
