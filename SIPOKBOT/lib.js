// Fonctions pures (sans réseau) : testables avec `npm test`.
import fs from 'node:fs';
import path from 'node:path';

/** "22890123456:12@s.whatsapp.net" -> "22890123456" (retire le suffixe d'appareil ":12"). */
export function userPart(jid = '') {
  return String(jid).split('@')[0].split(':')[0];
}

/**
 * Numéro de téléphone (chiffres) depuis un JID classique.
 * Retourne '' pour les identifiants @lid, @g.us, etc.
 * (Correctif : l'ancienne version concaténait le suffixe d'appareil au numéro.)
 */
export function phoneFromJid(jid = '') {
  const s = String(jid || '');
  if (!s) return '';
  if (!s.includes('@')) return s.replace(/\D/g, '');
  if (!s.endsWith('@s.whatsapp.net')) return '';
  return userPart(s).replace(/\D/g, '');
}

/**
 * Retrouve le vrai numéro de l'expéditeur, même quand WhatsApp utilise
 * un identifiant @lid (champs senderPn / participantPn fournis par Baileys).
 */
export function resolveSenderPhone(key = {}, isGroup = false) {
  const candidates = isGroup
    ? [key.participantPn, key.participant]
    : [key.senderPn, key.remoteJidAlt, key.remoteJid];
  for (const c of candidates) {
    const p = phoneFromJid(c);
    if (p) return p;
  }
  return '';
}

function unwrap(message) {
  let cur = message;
  for (let i = 0; i < 5 && cur; i++) {
    const inner =
      cur.ephemeralMessage?.message ||
      cur.viewOnceMessage?.message ||
      cur.viewOnceMessageV2?.message ||
      cur.documentWithCaptionMessage?.message;
    if (!inner) break;
    cur = inner;
  }
  return cur;
}

export function extractText(msg) {
  const m = unwrap(msg?.message);
  if (!m) return '';
  return String(
    m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      ''
  ).trim();
}

/** Timestamp WhatsApp (secondes) -> nombre, gère l'objet Long de protobuf. */
export function toSeconds(ts) {
  if (ts == null) return NaN;
  if (typeof ts === 'object' && typeof ts.toNumber === 'function') return ts.toNumber();
  return Number(ts);
}

/** Masque un identifiant pour les journaux (aucun numéro complet dans les logs). */
export function maskId(jid = '') {
  const u = userPart(jid);
  if (u.length <= 5) return '***';
  return `${u.slice(0, 3)}***${u.slice(-2)}`;
}

/** Limiteur à fenêtre glissante, par clé (ex. par contact). */
export class RateLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  allow(key, now = Date.now()) {
    const recent = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 2000) this.hits.delete(this.hits.keys().next().value);
    return true;
  }
}

/** Ensemble d'identifiants avec expiration (anti-doublon par id de message). */
export class TtlSet {
  constructor(ttlMs, max = 5000) {
    this.ttlMs = ttlMs;
    this.max = max;
    this.map = new Map();
  }
  /** true si la valeur est nouvelle (et la mémorise), false si déjà vue. */
  addIfNew(value, now = Date.now()) {
    const seen = this.map.get(value);
    if (seen !== undefined && now - seen < this.ttlMs) return false;
    this.map.set(value, now);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    return true;
  }
}

/** Plafond de réponses par jour (maîtrise des coûts). */
export class DailyCap {
  constructor(max) {
    this.max = max;
    this.day = '';
    this.count = 0;
  }
  _roll(now) {
    const d = new Date(now).toISOString().slice(0, 10);
    if (d !== this.day) {
      this.day = d;
      this.count = 0;
    }
  }
  tryConsume(now = Date.now()) {
    this._roll(now);
    if (this.max > 0 && this.count >= this.max) return false;
    this.count += 1;
    return true;
  }
  used(now = Date.now()) {
    this._roll(now);
    return this.count;
  }
}

export const DEFAULT_CONFIG = {
  enabled: true,
  replyToPrivateMessages: true,
  replyToUnknownContacts: true,
  replyToGroups: false,
  groupAllowlist: [],
  contacts: {},
  defaultInstructions:
    "Tu es SIPOKBOT, assistant de SIPOKTECK. Tu réponds en français, de façon naturelle, respectueuse et utile. Tu ne prétends jamais être humain. Tu n'inventes pas les informations inconnues. Tu ne prétends jamais avoir effectué une action externe."
};

export function loadConfig(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Impossible de lire ${file} : ${error.message}`);
  }
  return { ...DEFAULT_CONFIG, ...raw };
}

/** Écriture atomique : un crash pendant l'écriture ne corrompt plus config.json. */
export function saveJsonAtomic(file, data) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

export function isRetryableError(error) {
  const status = Number(error?.status ?? error?.code);
  if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
  return /UNAVAILABLE|overloaded|RESOURCE_EXHAUSTED|timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
    String(error?.message || error)
  );
}
