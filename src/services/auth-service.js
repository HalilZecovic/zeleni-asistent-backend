import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/app-error.js';

function handleError(error) {
  if (error) throw new AppError(400, 'AUTHENTICATION_ERROR', error.message);
}

export async function register({ email, password, full_name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });
  handleError(error);
  return data;
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  handleError(error);
  return data;
}

export async function logout(token) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new AppError(400, 'LOGOUT_FAILED', 'Odjava nije uspjela.');
  }
}
