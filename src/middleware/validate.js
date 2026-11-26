import { AppError } from '../utils/app-error.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        'Zahtjev sadrži neispravne podatke.',
        result.error.flatten()
      ));
    }

    if (source === 'query') {
      req.validated = { ...req.validated, query: result.data };
    } else {
      req[source] = result.data;
    }
    next();
  };
}
