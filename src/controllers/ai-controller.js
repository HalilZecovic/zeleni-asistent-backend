import * as service from '../services/ai-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ask = asyncHandler(async (req, res) => {
  res.json({ data: await service.ask(req.supabase, req.user.id, req.body) });
});

export const listSessions = asyncHandler(async (req, res) => {
  res.json({ data: await service.listSessions(req.supabase) });
});

export const listMessages = asyncHandler(async (req, res) => {
  res.json({ data: await service.listMessages(req.supabase, req.params.id) });
});
