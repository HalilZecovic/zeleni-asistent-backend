import { createUserClient } from '../config/supabase.js';
import { AppError } from '../utils/app-error.js';

export async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Za pristup je potreban Bearer token.'));
  }

  try {
    const client = createUserClient(token);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Token nije važeći ili je istekao.'));
    }

    req.user = { id: user.id, email: user.email };
    req.supabase = client;
    next();
  } catch (error) {
    next(error);
  }
}
