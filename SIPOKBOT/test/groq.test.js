import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroq } from '../groq.js';

test('generateGroq appelle le endpoint Groq et retourne le texte', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(options.body), {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Bonjour' }],
      max_tokens: 1024,
      temperature: 0.7
    });
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Bonjour !' } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  assert.equal(await generateGroq(
    [{ role: 'user', content: 'Bonjour' }],
    { apiKey: 'test-key', model: 'test-model' }
  ), 'Bonjour !');
});

test('generateGroq remonte les erreurs API sans exposer la clé', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: { message: 'Invalid API Key' }
  }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

  await assert.rejects(
    generateGroq([], { apiKey: 'test-secret', model: 'test-model' }),
    error => error.status === 401 && !error.message.includes('test-secret')
  );
});
