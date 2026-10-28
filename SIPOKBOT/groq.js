import { setTimeout as sleep } from 'node:timers/promises';
import { isRetryableError } from './lib.js';

export async function generateGroq(messages, { apiKey, model, timeoutMs = 30000 }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw Object.assign(new Error(`Réponse Groq illisible (HTTP ${response.status}).`), {
          status: response.status
        });
      }

      if (!response.ok) {
        const message = result?.error?.message || `HTTP ${response.status}`;
        throw Object.assign(new Error(`Erreur Groq : ${message}`), { status: response.status });
      }

      const answer = result?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Groq a renvoyé une réponse vide.');
      return answer;
    } catch (error) {
      if (attempt >= 2 || !isRetryableError(error)) throw error;
      await sleep(1500 * 2 ** attempt);
    }
  }
}
