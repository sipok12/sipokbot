import test from 'node:test';
import assert from 'node:assert/strict';
import {
  phoneFromJid, resolveSenderPhone, extractText, toSeconds, maskId,
  RateLimiter, TtlSet, DailyCap, isRetryableError, userPart
} from '../lib.js';

test('phoneFromJid retire le suffixe appareil (ancien bug)', () => {
  assert.equal(phoneFromJid('22890123456@s.whatsapp.net'), '22890123456');
  assert.equal(phoneFromJid('22890123456:12@s.whatsapp.net'), '22890123456');
  assert.equal(phoneFromJid('123456@lid'), '');
  assert.equal(phoneFromJid('1203@g.us'), '');
  assert.equal(phoneFromJid(''), '');
});

test('resolveSenderPhone gère les identifiants @lid', () => {
  assert.equal(resolveSenderPhone({ remoteJid: '999@lid', senderPn: '22890123456@s.whatsapp.net' }), '22890123456');
  assert.equal(resolveSenderPhone({ remoteJid: '22890123456@s.whatsapp.net' }), '22890123456');
  assert.equal(resolveSenderPhone({ remoteJid: '999@lid' }), '');
  assert.equal(resolveSenderPhone({ remoteJid: 'g@g.us', participant: '7@lid', participantPn: '22891000000@s.whatsapp.net' }, true), '22891000000');
});

test('extractText lit texte, légende et messages éphémères', () => {
  assert.equal(extractText({ message: { conversation: ' salut ' } }), 'salut');
  assert.equal(extractText({ message: { imageMessage: { caption: 'photo' } } }), 'photo');
  assert.equal(extractText({ message: { ephemeralMessage: { message: { extendedTextMessage: { text: 'hello' } } } } }), 'hello');
  assert.equal(extractText({ message: { audioMessage: {} } }), '');
  assert.equal(extractText({}), '');
});

test('toSeconds accepte nombre, chaîne et Long', () => {
  assert.equal(toSeconds(10), 10);
  assert.equal(toSeconds('10'), 10);
  assert.equal(toSeconds({ toNumber: () => 42 }), 42);
  assert.ok(Number.isNaN(toSeconds(undefined)));
});

test('maskId ne révèle pas le numéro complet', () => {
  assert.equal(maskId('22890123456@s.whatsapp.net'), '228***56');
  assert.equal(userPart('22890123456:3@s.whatsapp.net'), '22890123456');
});

test('RateLimiter bloque au-delà du maximum puis libère', () => {
  const r = new RateLimiter(2, 1000);
  assert.ok(r.allow('a', 0)); assert.ok(r.allow('a', 10));
  assert.ok(!r.allow('a', 20));
  assert.ok(r.allow('b', 20));
  assert.ok(r.allow('a', 1100));
});

test('TtlSet détecte les doublons puis oublie', () => {
  const s = new TtlSet(1000);
  assert.ok(s.addIfNew('x', 0));
  assert.ok(!s.addIfNew('x', 500));
  assert.ok(s.addIfNew('x', 2000));
});

test('DailyCap plafonne puis repart le lendemain', () => {
  const c = new DailyCap(2);
  const d1 = Date.UTC(2026, 0, 1, 10), d2 = Date.UTC(2026, 0, 2, 10);
  assert.ok(c.tryConsume(d1)); assert.ok(c.tryConsume(d1));
  assert.ok(!c.tryConsume(d1));
  assert.ok(c.tryConsume(d2));
  assert.ok(new DailyCap(0).tryConsume()); // 0 = illimité
});

test('isRetryableError', () => {
  assert.ok(isRetryableError({ status: 429 }));
  assert.ok(isRetryableError(new Error('503 UNAVAILABLE')));
  assert.ok(!isRetryableError({ status: 400, message: 'API key not valid' }));
});
