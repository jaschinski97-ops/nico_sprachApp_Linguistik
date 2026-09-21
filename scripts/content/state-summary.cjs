#!/usr/bin/env node
// Read-only Zusammenfassung des Helper-/state: Bestand je Sprache (shipped + stage).
const http = require('http');

http.get({ host: '127.0.0.1', port: 8082, path: '/state' }, (res) => {
  let raw = '';
  res.on('data', (c) => (raw += c));
  res.on('end', () => {
    try {
      const st = JSON.parse(raw);
      const shipped = {};
      const stage = {};
      for (const e of st.catalog?.entries || st.shipped?.entries || []) {
        if (e.kind !== 'vocabulary') continue;
        const lang = e.document?.language || e.id.split('-')[1] || '?';
        shipped[lang] = (shipped[lang] || 0) + 1;
      }
      for (const e of st.stage?.entries || []) {
        if (e.kind !== 'vocabulary') continue;
        const lang = e.document?.language || e.id.split('-')[1] || '?';
        stage[lang] = (stage[lang] || 0) + 1;
      }
      console.log('shipped Vokabeln je Sprache:', JSON.stringify(shipped, null, 0));
      console.log('stage Vokabeln je Sprache:', JSON.stringify(stage, null, 0));
      console.log('Top-Level-Keys der State-Antwort:', Object.keys(st).join(', '));
    } catch (err) {
      console.log('Parse-Fehler:', err.message, '| Anfang:', raw.slice(0, 300));
    }
  });
}).on('error', (e) => console.log('HTTP-Fehler:', e.message));
