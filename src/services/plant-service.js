import { AppError } from '../utils/app-error.js';

function check(error) {
  if (!error) return;
  if (error.code === '23503') {
    throw new AppError(400, 'INVALID_SPECIES', 'Odabrana vrsta biljke ne postoji.');
  }
  if (error.code === '23505') {
    throw new AppError(409, 'DUPLICATE_PLANT', 'Biljka sa tim podacima već postoji.');
  }
  console.error(error);
  throw new AppError(500, 'DATABASE_ERROR', 'Greška pri pristupu bazi podataka.');
}

export async function listSpecies(client) {
  const { data, error } = await client.from('plant_species').select('*').order('common_name');
  check(error);
  return data;
}

export async function listPlants(client) {
  const { data, error } = await client
    .from('user_plants')
    .select('*, plant_species(*)')
    .order('created_at', { ascending: false });
  check(error);
  return data;
}

export async function getPlant(client, id) {
  const { data, error } = await client
    .from('user_plants')
    .select('*, plant_species(*)')
    .eq('id', id)
    .maybeSingle();
  check(error);
  if (!data) throw new AppError(404, 'PLANT_NOT_FOUND', 'Biljka nije pronađena.');
  return data;
}

export async function createPlant(client, userId, input) {
  const { data, error } = await client
    .from('user_plants')
    .insert({ ...input, user_id: userId })
    .select('*, plant_species(*)')
    .single();
  check(error);
  return data;
}

export async function updatePlant(client, id, input) {
  const { data, error } = await client
    .from('user_plants')
    .update(input)
    .eq('id', id)
    .select('*, plant_species(*)')
    .maybeSingle();
  check(error);
  if (!data) throw new AppError(404, 'PLANT_NOT_FOUND', 'Biljka nije pronađena.');
  return data;
}

export async function deletePlant(client, id) {
  const { data, error } = await client.from('user_plants').delete().eq('id', id).select('id').maybeSingle();
  check(error);
  if (!data) throw new AppError(404, 'PLANT_NOT_FOUND', 'Biljka nije pronađena.');
}

export async function listCareEvents(client, plantId) {
  const { data, error } = await client
    .from('care_events')
    .select('*')
    .eq('plant_id', plantId)
    .order('occurred_at', { ascending: false });
  check(error);
  return data;
}

export async function createCareEvent(client, plantId, input) {
  const { data, error } = await client
    .from('care_events')
    .insert({ ...input, plant_id: plantId })
    .select()
    .single();
  check(error);
  return data;
}
