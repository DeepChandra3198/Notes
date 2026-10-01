// Forwards rejected promises to Express's error middleware,
// so you never write try/catch in controllers.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);