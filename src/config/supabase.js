import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  options
);

export function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}
