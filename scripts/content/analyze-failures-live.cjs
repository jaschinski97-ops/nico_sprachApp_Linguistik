#!/usr/bin/env node
// Live-Diagnose des LAUFENDEN Laufs: neue Fails seit 2026-09-17T11:55 UTC (nach Lauf-2-Ende 13:54 MESZ).
// Read-only — während des Laufs nichts ändern.
const fs = require('fs');
const path = require('path');
const http = require('http');

const LOG = path.join(__dirname, '..', '..', 'pipeline', 'logs', 'studio-failures.ndjson');
const alles = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const neu = alles.filter((e) => e.loggedAt > '2026-09-17T11:55:00');

console.log('Neue Fails seit 13:54 MESZ:', neu.length, '| Gesamt:', alles.length);
const jeArt = {}, jeSprache = {};
let keinUrteil = 0, mitGruenden = 0;
const grundKurz = {};
for (const e of neu) {
  jeArt[e.kind] = (jeArt[e.kind] || 0) + 1;
  jeSprache[`${e.kind}|${e.language || '?'}`] = (jeSprache[`${e.kind}|${e.language || '?'}`] || 0) + 1;
  if (e.kind === 'kreuzpruefung') {
    const g = String(e.gruende || '');
    if (/Kein Urteil/.test(g)) keinUrteil++;
    else {
      mitGruenden++;
      // Erste 40 Zeichen des ersten Grundes als Signatur zaehlen
      const sig = g.split('|')[0].trim().slice(0, 45);
      grundKurz[sig] = (grundKurz[sig] || 0) + 1;
    }
  }
}
console.log('Je Art:', JSON.stringify(jeArt));
console.log('Je Art|Sprache:', JSON.stringify(jeSprache));
console.log(`kreuzpruefung: ${keinUrteil}x KEIN-URTEIL (fail-closed, kaputte Pruefer-Antwort!) vs. ${mitGruenden}x mit Gruenden`);
console.log('Top-Grund-Signaturen:');
for (const [sig, n] of Object.entries(grundKurz).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log('  ', n + 'x', sig);
console.log('Zeitraum:', neu[0]?.loggedAt, '->', neu[neu.length - 1]?.loggedAt);

// Stichproben mit vollem Grund
console.log('\nStichproben (max 6, voller Grund):');
let sp = 0;
for (const e of neu) {
  if (e.kind !== 'kreuzpruefung' || sp >= 6) continue;
  if (/Kein Urteil/.test(e.gruende || '')) continue;
  console.log('  ', e.language, e.term, '—', String(e.gruende).slice(0, 220));
  sp++;
}

// Bestand jetzt
http.get({ host: '127.0.0.1', port: 8082, path: '/state' }, (res) => {
  let raw = '';
  res.on('data', (c) => (raw += c));
  res.on('end', () => {
    try {
      const st = JSON.parse(raw);
      const shipped = {};
      for (const e of st.shipped?.entries || []) {
        if (e.kind !== 'vocabulary') continue;
        const lang = e.document?.language || '?';
        shipped[lang] = (shipped[lang] || 0) + 1;
      }
      console.log('\nBestand jetzt (shipped):', JSON.stringify(shipped));
    } catch (e) { console.log('state parse error:', e.message); }
  });
}).on('error', (e) => console.log('HTTP-Fehler:', e.message));
