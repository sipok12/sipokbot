import 'dotenv/config';
import { generateGroq } from '../groq.js';

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

if (!apiKey || /COLLEZ|VOTRE_CLE|YOUR_/i.test(apiKey)) {
  console.error('Échec : GROQ_API_KEY est absente ou non renseignée dans .env.');
  process.exit(1);
}

try {
  const answer = await generateGroq(
    [{ role: 'user', content: 'Réponds uniquement par « API Groq OK ». ' }],
    { apiKey, model, timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 30000) }
  );
  console.log(`API Groq OK (modèle ${model}) : ${answer}`);
} catch (error) {
  console.error(`Échec du test Groq : ${error.message}`);
  process.exitCode = 1;
}
