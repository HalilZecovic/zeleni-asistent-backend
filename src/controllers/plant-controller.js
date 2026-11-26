import * as service from '../services/plant-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const listSpecies = asyncHandler(async (req, res) => {
  res.json({ data: await service.listSpecies(req.supabase) });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ data: await service.listPlants(req.supabase) });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ data: await service.getPlant(req.supabase, req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.createPlant(req.supabase, req.user.id, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ data: await service.updatePlant(req.supabase, req.params.id, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  await service.deletePlant(req.supabase, req.params.id);
  res.status(204).end();
});

export const listCareEvents = asyncHandler(async (req, res) => {
  await service.getPlant(req.supabase, req.params.id);
  res.json({ data: await service.listCareEvents(req.supabase, req.params.id) });
});

export const createCareEvent = asyncHandler(async (req, res) => {
  await service.getPlant(req.supabase, req.params.id);
  res.status(201).json({
    data: await service.createCareEvent(req.supabase, req.params.id, req.body)
  });
});
