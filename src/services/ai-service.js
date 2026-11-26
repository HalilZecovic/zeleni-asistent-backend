import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

function checkDatabase(error) {
  if (!error) return;
  if (error.code === 'P0001') throw new AppError(404, 'AI_SESSION_NOT_FOUND', 'Razgovor nije pronađen.');
  console.error(error);
  throw new AppError(500, 'DATABASE_ERROR', 'Greška pri pristupu bazi podataka.');
}

async function loadPlantContext(client, userId, plantId) {
  let query = client
    .from('user_plants')
    .select('id, nickname, location, light_level, notes, plant_species(common_name, scientific_name, description, care_instructions)')
    .eq('user_id', userId);

  if (plantId) query = query.eq('id', plantId);
  const { data: plants, error } = await query;
  checkDatabase(error);

  if (plantId && plants.length === 0) {
    throw new AppError(404, 'PLANT_NOT_FOUND', 'Biljka nije pronađena.');
  }

  const history = [];
  for (const plant of plants) {
    const { data: events, error: eventError } = await client
      .from('care_events')
      .select('event_type, occurred_at, notes')
      .eq('plant_id', plant.id)
      .order('occurred_at', { ascending: false })
      .limit(10);
    checkDatabase(eventError);
    history.push({ plant_id: plant.id, events });
  }
  return { plants, recent_care_events: history };
}

async function loadConversation(client, sessionId, plantId) {
  if (!sessionId) return [];

  const { data: session, error: sessionError } = await client
    .from('ai_sessions')
    .select('id, plant_id')
    .eq('id', sessionId)
    .maybeSingle();
  checkDatabase(sessionError);
  if (!session) throw new AppError(404, 'AI_SESSION_NOT_FOUND', 'Razgovor nije pronađen.');
  if (plantId && session.plant_id && session.plant_id !== plantId) {
    throw new AppError(409, 'AI_SESSION_PLANT_MISMATCH', 'Razgovor je povezan sa drugom biljkom.');
  }

  const { data: messages, error } = await client
    .from('ai_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);
  checkDatabase(error);
  return messages ?? [];
}

async function generateAdvice(question, context, history) {
  if (!env.AI_API_KEY) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI savjetnik još nije konfigurisan. Dodaj AI_API_KEY u .env.');
  }

  let response;
  try {
    response = await fetch(`${env.AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'Ti si Zeleni Asistent, pažljiv digitalni savjetnik za kućne biljke. Odgovaraj na jeziku korisnika. Koristi dostavljene podatke o njegovim biljkama, osvjetljenju i evidenciji njege. Daj konkretne i oprezne korake za njegu. Ne izmišljaj podatke koji nedostaju; reci kada je potrebna dodatna informacija. Kod mogućih bolesti navedi da je procjena informativna, ne garantuj dijagnozu i predloži izolovanje biljke ako postoji rizik širenja. Nikada ne preporučuj gutanje biljaka ili neprovjerene hemikalije.'
          },
          {
            role: 'system',
            content: `Podaci o biljkama i njezi korisnika:\n${JSON.stringify(context)}`
          },
          ...history,
          { role: 'user', content: question }
        ]
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    console.error('AI provider request failed:', error);
    throw new AppError(502, 'AI_UNAVAILABLE', 'AI servis trenutno nije dostupan.');
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error('AI provider returned an error:', response.status, detail);
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'AI servis nije uspio obraditi pitanje.');
  }

  const result = await response.json();
  const answer = result.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new AppError(502, 'AI_EMPTY_RESPONSE', 'AI servis je vratio prazan odgovor.');
  }
  return answer;
}

export async function ask(client, userId, { question, plant_id: plantId, session_id: sessionId }) {
  const context = await loadPlantContext(client, userId, plantId);
  const history = await loadConversation(client, sessionId, plantId);
  const answer = await generateAdvice(question, context, history);

  const { data: savedSessionId, error: sessionError } = await client.rpc('save_ai_exchange', {
    p_session_id: sessionId ?? null,
    p_question: question,
    p_answer: answer,
    p_plant_id: plantId ?? null
  });
  checkDatabase(sessionError);

  return { session_id: savedSessionId, question, answer };
}

export async function listSessions(client) {
  const { data, error } = await client
    .from('ai_sessions')
    .select('id, plant_id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });
  checkDatabase(error);
  return data;
}

export async function listMessages(client, sessionId) {
  const { data, error } = await client
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at');
  checkDatabase(error);
  if (!data?.length) {
    const { data: session, error: sessionError } = await client
      .from('ai_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();
    checkDatabase(sessionError);
    if (!session) throw new AppError(404, 'AI_SESSION_NOT_FOUND', 'Razgovor nije pronađen.');
  }
  return data;
}
