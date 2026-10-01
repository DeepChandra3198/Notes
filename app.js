import express from 'express';
import routes from './src/routes/index.js';
import {
  errorHandler,
  notFoundHandler,
} from './src/common/middlewares/errorHandler.js';
import { apiLimiter } from './src/common/middlewares/rateLimiter.js';

const app = express();

app.use(express.json());
app.use('/api/v1',apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler); // always last

export default app;