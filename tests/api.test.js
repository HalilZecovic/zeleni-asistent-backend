import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
let server;
let api;

before(() => {
  server = app.listen(0);
  api = request(server);
});

after(() => server.close());

test('health endpoint reports server status', async () => {
  const response = await api.get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('registration validates input before calling Supabase', async () => {
  const response = await api.post('/api/v1/auth/register').send({ email: 'bad-email' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('plant endpoints require authentication', async () => {
  const response = await api.get('/api/v1/plants');
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('AI endpoint requires authentication', async () => {
  const response = await api.post('/api/v1/ai/ask').send({ question: 'hi' });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('malformed JSON receives a JSON 400 response', async () => {
  const response = await api.post('/api/v1/auth/register')
    .set('Content-Type', 'application/json')
    .send('{"email":');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});

test('unknown route returns a JSON 404 response', async () => {
  const response = await api.get('/no-such-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});
