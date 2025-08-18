import express from 'express';

import userSignUp from '../controller/SignUp.js';
import userSignIn from '../controller/userSignin.js';

const AuthRouter = express.Router();

AuthRouter.post('/', userSignIn);
AuthRouter.post('/signUp', userSignUp);

export default AuthRouter;
