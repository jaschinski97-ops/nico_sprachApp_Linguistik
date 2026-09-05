const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { ContentPipeline } = require('./content-pipeline.cjs');
const ORIGIN = 'http://localhost:8081';
function createStudio(root) {
  const pipeline = new ContentPipeline(root);
  let queue = Promise.resolve();
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Exact Host and Origin checks block DNS rebinding and other web origins.
    const host = req.headers.host;
    const port = res.socket.localPort;
    if (![ `localhost:${port}`, `127.0.0.1:${port}` ].includes(host)) { res.writeHead(403); res.end(); return; }
    if (req.headers.origin && req.headers.origin !== ORIGIN) { res.writeHead(403); res.end(); return; }
    if (req.headers.origin === ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', ORIGIN);
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
      if (req.method !== 'POST' || !['/stage','/review','/publish'].includes(req.url)) { json(404, { error: 'Unbekannter Pfad.' }); return; }
      if (req.headers.origin !== ORIGIN || req.headers['content-type'] !== 'application/json') { json(403, { error: 'Nur die lokale Entwickler-App darf schreiben.' }); return; }
      let size = 0; const parts = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw Error('Einzelexport überschreitet 32 MiB.');
        parts.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(parts).toString('utf8'));
      const action = () => req.url === '/stage' ? pipeline.stage(data) : req.url === '/review' ? pipeline.review(data) : pipeline.publish();
      const operation = queue.then(action);
      queue = operation.catch(() => {});
      json(200, await operation);
    } catch (error) { json(400, { error: error.message }); }
  });
}
if (require.main === module) {
  createStudio(path.resolve(__dirname, '..')).listen(8082, '127.0.0.1', () => {
    console.log('Inhaltsstudio bereit. App: http://localhost:8081/settings · nur Loopback, keine API-Schlüssel im Export.');
  });
}
module.exports = { createStudio };
