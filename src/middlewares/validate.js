import { HttpError } from '../shared/errors.js';

/**
 * Validates req[source] ('body' | 'query' | 'params') with a Zod schema.
 * The parsed (and transformed) result is available as req.valid[source].
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(
      new HttpError(400, 'Validation failed', {
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      }),
    );
  }
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  next();
};

export default validate;
