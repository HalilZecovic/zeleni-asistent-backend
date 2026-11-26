import { z } from 'zod';

const uuid = z.string().uuid();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(2).max(100)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const plantSchema = z.object({
  species_id: uuid,
  nickname: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).nullable().optional(),
  light_level: z.enum(['low', 'medium', 'bright_indirect', 'direct']).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  acquired_at: z.string().date().nullable().optional()
});

export const plantPatchSchema = plantSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Potrebno je navesti barem jedno polje za izmjenu.'
);

export const careEventSchema = z.object({
  event_type: z.enum(['watering', 'fertilizing', 'pruning', 'repotting', 'observation']),
  occurred_at: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).nullable().optional()
});

export const aiQuestionSchema = z.object({
  question: z.string().trim().min(5).max(2000),
  plant_id: uuid.optional(),
  session_id: uuid.optional()
});

export const idParamSchema = z.object({ id: uuid });
