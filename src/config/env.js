import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  AI_API_KEY: z.string().optional().default(''),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  CORS_ORIGIN: z.string().default('*')
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Neispravna konfiguracija okruženja:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
