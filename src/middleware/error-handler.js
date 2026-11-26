import { AppError } from '../utils/app-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let handled = error;
  if (error?.type === 'entity.parse.failed') {
    handled = new AppError(400, 'INVALID_JSON', 'Tijelo zahtjeva nije validan JSON.');
  } else if (!(error instanceof AppError)) {
    console.error(error);
  }

  const known = handled instanceof AppError;
  const response = {
    error: {
      code: known ? handled.code : 'INTERNAL_SERVER_ERROR',
      message: known ? handled.message : 'Došlo je do greške na serveru.'
    }
  };

  if (known && handled.details) response.error.details = handled.details;
  res.status(known ? handled.status : 500).json(response);
}
