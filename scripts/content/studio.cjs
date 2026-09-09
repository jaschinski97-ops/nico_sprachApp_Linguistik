const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { ContentPipeline } = require('./pipeline.cjs');
const { tryWriteProtocol } = require('../pipeline/protocol.cjs');
// Beide Loopback-Schreibweisen gültig — der Helper selbst wird über
// 127.0.0.1 angesprochen (Review P2-5, 2026-09-09).
const ALLOWED_ORIGINS = new Set(['http://localhost:8081', 'http://127.0.0.1:8081']);
const originAllowed = (origin) => typeof origin === 'string' && ALLOWED_ORIGINS.has(origin);

// ---------------------------------------------------------------------------
// TTS-Proxy für das Web-Studio (ROADMAP v2, Phase 2): Der Browser auf 8081
// kann api.openai.com nicht zuverlässig direkt rufen (CORS kann sich jederzeit
// wieder ändern — gemessen 2026-09-08 offen, 2026-09-03 zu). Der Helper ruft
// stattdessen serverseitig mit OPENAI_API_KEY aus der Umgebung auf und reicht
// die Audiodaten durch. Der Schlüssel verlässt den Prozess nie als Antwort.
// ---------------------------------------------------------------------------

const TTS_LIMITS = {
  maxTextLength: 2000,
  maxRequestsPerMinute: 30,
  maxBodyBytes: 64 * 1024,
  maxAudioBytes: 32 * 1024 * 1024,
  timeoutMs: 60000,
  defaultModel: 'gpt-4o-mini-tts-2025-12-15',
  defaultVoice: 'coral',
};
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const SAFE_NAME = /^[\w.:-]{1,120}$/;

/** Einfaches gleitendes Fenster (localhost-Einzelplatzwerkzeug, kein Konto). */
function createRateLimiter({ max = TTS_LIMITS.maxRequestsPerMinute, windowMs = 60000, now = Date.now } = {}) {
  const hits = [];
  return function allowRequest() {
    const timestamp = now();
    while (hits.length && timestamp - hits[0] >= windowMs) hits.shift();
    if (hits.length >= max) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - timestamp) / 1000)) };
    hits.push(timestamp);
    return { ok: true };
  };
}

function ttsRequestError(code, message, upstream = false) {
  return Object.assign(new Error(message), { statusCode: code, upstream });
}

/**
 * Der eigentliche Proxy-Handler, vom Server getrennt, damit node:test ihn
 * direkt mit nachgestellten req/res-Objekten und gemocktem fetch Aufruf für
 * Aufruf prüfen kann. Antwortet mit den rohen Audio-Bytes (mp3) oder JSON-
 * Fehlern; der API-Schlüssel wird nie ausgespielt.
 */
async function handleTtsProxy(req, res, {
  getApiKey = () => process.env.OPENAI_API_KEY,
  openaiFetch = fetch,
  logRun = tryWriteProtocol,
  allowRequest = () => ({ ok: true }),
  limits = TTS_LIMITS,
} = {}) {
  const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const log = (result, notes) => { try { logRun({ script: 'studio-helper', action: 'openai-tts', items: 1, result, notes }); } catch { /* Protokoll darf nie die Antwort blockieren */ } };
  try {
    const gate = allowRequest();
    if (!gate.ok) throw ttsRequestError(429, `Rate-Limit: maximal ${limits.maxRequestsPerMinute} Aufrufe pro Minute. In ${gate.retryAfterSeconds}s wiederholen.`);
    if (req.headers['content-type'] !== 'application/json') throw ttsRequestError(400, 'Content-Type application/json erwartet.');
    let size = 0;
    const parts = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limits.maxBodyBytes) throw ttsRequestError(413, 'Anfragekörper zu groß.');
      parts.push(chunk);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(parts).toString('utf8')); }
    catch { throw ttsRequestError(400, 'Ungültiges JSON.'); }
    if (typeof data !== 'object' || data === null) throw ttsRequestError(400, 'JSON-Objekt erwartet.');
    const { text, voice = limits.defaultVoice, model = limits.defaultModel, purpose } = data;
    if (typeof text !== 'string' || !text.trim()) throw ttsRequestError(400, 'text fehlt oder ist leer.');
    if (text.length > limits.maxTextLength) throw ttsRequestError(400, `text überschreitet ${limits.maxTextLength} Zeichen (${text.length}).`);
    if (typeof model !== 'string' || !SAFE_NAME.test(model)) throw ttsRequestError(400, 'model enthält unerwartete Zeichen.');
    if (typeof voice !== 'string' || !SAFE_NAME.test(voice)) throw ttsRequestError(400, 'voice enthält unerwartete Zeichen.');
    if (purpose !== undefined && (typeof purpose !== 'string' || purpose.length > 200)) throw ttsRequestError(400, 'purpose ist kein kurzer Text.');

    const apiKey = getApiKey();
    if (!apiKey) throw ttsRequestError(500, 'OPENAI_API_KEY ist im Helper nicht gesetzt (Umgebung, nicht Datei).');

    let upstream;
    try {
      upstream = await openaiFetch(OPENAI_SPEECH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, voice, input: text, response_format: 'mp3' }),
        signal: AbortSignal.timeout(limits.timeoutMs),
      });
    } catch (error) {
      throw ttsRequestError(502, `OpenAI nicht erreichbar (${error.message}).`, true);
    }
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 200);
      throw ttsRequestError(upstream.status >= 500 ? 502 : upstream.status, `OpenAI ${upstream.status}: ${detail}`, true);
    }
    const contentType = upstream.headers.get('content-type') ?? 'audio/mpeg';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Tts-Model': model,
      'X-Tts-Voice': voice,
    });
    let bytes = 0;
    try {
      for await (const chunk of Readable.fromWeb(upstream.body)) {
        bytes += chunk.length;
        if (bytes > limits.maxAudioBytes) throw new Error(`Antwort größer als ${limits.maxAudioBytes} Byte.`);
        if (!res.write(chunk)) await new Promise((resolve) => res.once('drain', resolve));
      }
      res.end();
    } catch (error) {
      res.destroy();
      throw ttsRequestError(502, `Übertragung abgebrochen: ${error.message}`, true);
    }
    try { logRun({ script: 'studio-helper', action: 'openai-tts', model, voice, items: 1, result: 'ok', notes: `${purpose ? `Zweck ${purpose}; ` : ''}${bytes} Byte Audio` }); } catch { /* siehe oben */ }
  } catch (error) {
    const code = error.statusCode ?? 500;
    if (res.headersSent) res.destroy();
    else json(code, { error: error.message });
    if (error.upstream || code >= 500) log('error', error.message);
    else log('rejected', error.message);
  }
}

function createStudio(root, { getApiKey, openaiFetch, logRun, allowRequest = createRateLimiter() } = {}) {
  const pipeline = new ContentPipeline(root);
  let queue = Promise.resolve();
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Exact Host and Origin checks block DNS rebinding and other web origins.
    const host = req.headers.host;
    const port = res.socket.localPort;
    if (![ `localhost:${port}`, `127.0.0.1:${port}` ].includes(host)) { res.writeHead(403); res.end(); return; }
    if (req.headers.origin && !originAllowed(req.headers.origin)) { res.writeHead(403); res.end(); return; }
    if (originAllowed(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      if (req.method === 'GET' && req.url === '/state') { json(200, await pipeline.state()); return; }
      if (req.method === 'GET' && /^\/asset\/[a-f0-9]{64}\.(mp3|png|jpeg|webp)$/.test(req.url)) {
        const name = req.url.slice('/asset/'.length);
        let bytes;
        try { bytes = await fs.readFile(path.join(pipeline.work, name)); }
        catch (error) { if (error.code !== 'ENOENT') throw error; bytes = await fs.readFile(path.join(root, 'assets/content', name)); }
        res.writeHead(200, { 'Content-Type': name.endsWith('.mp3') ? 'audio/mpeg' : 'image/' + name.split('.').pop(), 'Content-Length': bytes.length });
        res.end(bytes); return;
      }
      if (req.method === 'POST' && req.url === '/api/openai/tts') {
        if (!originAllowed(req.headers.origin) || req.headers['content-type'] !== 'application/json') { json(403, { error: 'Nur die lokale Entwickler-App darf den Helper nutzen.' }); return; }
        await handleTtsProxy(req, res, { getApiKey, openaiFetch, logRun, allowRequest });
        return;
      }
      if (req.method !== 'POST' || !['/stage','/publish'].includes(req.url)) { json(404, { error: 'Unbekannter Pfad.' }); return; }
      if (!originAllowed(req.headers.origin) || req.headers['content-type'] !== 'application/json') { json(403, { error: 'Nur die lokale Entwickler-App darf schreiben.' }); return; }
      let size = 0; const parts = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw Error('Einzelexport überschreitet 32 MiB.');
        parts.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(parts).toString('utf8'));
      const action = () => req.url === '/stage' ? pipeline.stage(data) : pipeline.publish();
      const operation = queue.then(action);
      queue = operation.catch(() => {});
      json(200, await operation);
    } catch (error) { json(400, { error: error.message }); }
  });
}
if (require.main === module) {
  createStudio(path.resolve(__dirname, '../..')).listen(8082, '127.0.0.1', () => {
    console.log('Inhaltsstudio bereit. App: http://localhost:8081/settings · nur Loopback, keine API-Schlüssel im Export.');
  });
}
module.exports = { createStudio, handleTtsProxy, createRateLimiter, TTS_LIMITS };
