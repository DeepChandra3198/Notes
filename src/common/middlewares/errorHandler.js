import { AppError } from '../errors/AppError.js';

export const notFoundHandler = (req, _res, next) =>
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const isOperational = err instanceof AppError;

  if (!isOperational) console.error(err); // unexpected bug: log it

  res.status(isOperational ? err.statusCode : 500).json({
    success: false,
    message: isOperational ? err.message : 'Internal server error',
    ...(err.details && { errors: err.details }),
  });
};