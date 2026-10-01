import { ValidationError } from '../errors/AppError.js';

/**
 * validate({ body, params, query }) - each value is a Zod schema.
 * Parsed (and coerced) data lands on req.validated.
 * We don't overwrite req.query because it's read-only in Express 5.
 */
export const validate = (schemas) => (req, _res, next) => {
  const issues = [];
  req.validated = {};

  for (const key of ['body', 'params', 'query']) {
    if (!schemas[key]) continue;

    const result = schemas[key].safeParse(req[key]);
    if (result.success) {
      req.validated[key] = result.data;
    } else {
      issues.push(
        ...result.error.issues.map((i) => ({
          in: key,
          field: i.path.join('.'),
          message: i.message,
        }))
      );
    }
  }

  if (issues.length) return next(new ValidationError(issues));
  next();
};