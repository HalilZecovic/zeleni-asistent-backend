import * as service from '../services/auth-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const register = asyncHandler(async (req, res) => {
  const data = await service.register(req.body);
  res.status(201).json({ data: { user: data.user, session: data.session } });
});

export const login = asyncHandler(async (req, res) => {
  const data = await service.login(req.body);
  res.json({ data: { user: data.user, session: data.session } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.get('authorization').replace(/^Bearer\s+/i, '');
  await service.logout(token);
  res.status(204).end();
});
