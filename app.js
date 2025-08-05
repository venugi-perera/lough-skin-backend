// import compression from 'compression';
// import cors from 'cors';
// import express from 'express';
// import helmet from 'helmet';
// import morgan from 'morgan';

// import Connect from './connection/connect.js'; // Import the Connect function
// import Router from './Routes/Router.js';
// import setupSwagger from './swaggerConfig.js';

// const app = express();
// // Setup Swagger documentation
// setupSwagger(app);
// // Initialize MongoDB connection
// Connect();

// app.use(morgan('combined'));
// app.use(helmet());
// app.use(compression());
// app.use(cors());
// app.use(express.json());

// app.get('/', (req, res) => {
//   res.send('API is running...');
// });
// app.use('/auth', Router.SigninRouter);
// app.use('/api', Router.bookingRouter);
// app.use('/api', Router.paymentsRouter);

// export default app;

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import Connect from './connection/connect.js';
import setupSwagger from './swaggerConfig.js';
import Router from './Routes/Router.js';
import webhookRouter from './Routes/webhook.js'; // ✅ new webhook router
import bookingSuccess from './Routes/bookingSuccess.js'; // ✅ new booking success route

const app = express();

// ✅ Stripe webhook route MUST come BEFORE express.json()
app.use('/api/webhook', webhookRouter);

// 🧠 Initialize database and docs AFTER webhook is defined
Connect();
setupSwagger(app);

// ✅ Global middlewares AFTER webhook
app.use(morgan('combined'));
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json()); // ✅ JSON body parsing for all other routes

// ✅ Normal Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use('/auth', Router.SigninRouter);
app.use('/api', Router.bookingRouter);
app.use('/api', Router.paymentsRouter);
app.use('/api', bookingSuccess);

export default app;
