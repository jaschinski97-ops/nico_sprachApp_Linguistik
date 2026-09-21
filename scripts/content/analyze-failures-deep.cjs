#!/usr/bin/env node
// Deep-Dive: Sprache x Kategorie, es-Ausreisserstunde, Mehrfach-Ablehnungen, /state-report.
const fs = require('fs');
const path = require('path');
const http = require('http');

const LOG = path.join(__dirname, '..', '..', 'pipeline', 'logs', 'studio-failures.ndjson');
const entries = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const RULES = [
  ['ipa/umschrift', /(ipa|lautschrift|umschrift|phonetik|transkription|aussprache)/i],
  ['uebersetzung/polysemie', /(übersetz|bedeutung|semant|nicht alle bedeutungen|mehrdeutig|kontext)/i],
  ['beispielsatz', /(beispiels|satz|idiomat|unnatürlich)/i],
  ['grammatik/wortart', /(grammatik|wortart|genus|artikel|plural|konjugation|adverb|adjektiv|substantiv|verb|interjektion|präposition)/i],
  ['nicht-hochfrequent-VORWURF', /(hochfrequen|alltags|grundbegriff|grundwortschatz|selten|speziell|fach|veraltet|formell)/i],
  ['ton/silben/betonung', /(ton|silbe|betonung|kontur)/i],
];

// 1) Matrix Sprache x Kategorie
const matrix = {};
for (const e of entries) {
  if (e.kind !== 'kreuzpruefung') continue;
  const lang = e.language || '?';
  matrix[lang] = matrix[lang] || {};
  const seen = new Set();
  for (const r of String(e.gruende || '').split(/\s*\|\s*/).filter(Boolean)) {
    for (const [name, re] of RULES) if (re.test(r)) seen.add(name);
  }
  if (!seen.size) { seen.add('(sonstig)'); }
  for (const n of seen) matrix[lang][n] = (matrix[lang][n] || 0) + 1;
}
console.log('=== MATRIX Sprache x Grund-Kategorie (Wort kann mehrfach zaehlen) ===');
const cats = [...new Set(Object.values(matrix).flatMap((m) => Object.keys(m)))];
console.log('Sprache | ' + cats.join(' | '));
for (const lang of Object.keys(matrix).sort()) {
  console.log(lang + ' | ' + cats.map((c) => matrix[lang][c] || 0).join(' | '));
}

// 2) es-Ausreisserstunde 09-17T08
const spike = entries.filter((e) => e.kind === 'kreuzpruefung' && e.language === 'es' && e.loggedAt >= '2026-09-17T08' && e.loggedAt < '2026-09-17T09');
console.log(`\n=== ES-SPROKE 09-17 08:00 UTC: ${spike.length} Ablehnungen ===`);
const spikeCats = {};
const spikeSamples = [];
for (const e of spike) {
  for (const r of String(e.gruende || '').split(/\s*\|\s*/).filter(Boolean)) {
    for (const [name, re] of RULES) if (re.test(r)) spikeCats[name] = (spikeCats[name] || 0) + 1;
    if (spikeSamples.length < 8) spikeSamples.push(`${e.term}: ${r.slice(0, 150)}`);
  }
}
console.log('Kategorien:', JSON.stringify(spikeCats));
console.log('Stichproben:');
for (const s of spikeSamples) console.log('  ', s);

// 3) Mehrfach abgelehnte Terms
const termCount = {};
for (const e of entries) {
  if (e.kind !== 'kreuzpruefung') continue;
  const k = `${e.language}:${(e.term || '').toLowerCase()}`;
  termCount[k] = (termCount[k] || 0) + 1;
}
const multi = Object.entries(termCount).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log(`\n=== MEHRFACH ABGELEHNT: ${multi.length} Begriffe (>1x), Top 12 ===`);
for (const [k, n] of multi.slice(0, 12)) console.log('  ', k, n + 'x');

// 4) Beispiele fuer offenbar falsche "nicht hochfrequent"-Urteile
console.log('\n=== "NICHT HOCHFREQUENT"-URTEILE (Stichprobe, oft absurde Basic-Worte) ===');
const hf = entries.filter((e) => e.kind === 'kreuzpruefung' && /hochfrequen|alltagsbegriff|grundbegriff/i.test(e.gruende || ''));
console.log('Gesamt:', hf.length, '| Stichprobe:', hf.slice(0, 12).map((e) => `${e.language}:${e.term}`).join(', '));

// 5) /state report + meta (Ziele)
http.get({ host: '127.0.0.1', port: 8082, path: '/state' }, (res) => {
  let raw = '';
  res.on('data', (c) => (raw += c));
  res.on('end', () => {
    try {
      const st = JSON.parse(raw);
      const r = st.report || {};
      console.log('\n=== /state REPORT ===');
      console.log('keys:', Object.keys(r).join(', '));
      const s = JSON.stringify(r);
      console.log(s.length > 1500 ? s.slice(0, 1500) + '...' : s);
      const m = st.meta || st.stage?.meta;
      if (m) console.log('meta:', JSON.stringify(m).slice(0, 800));
    } catch (e) { console.log('report parse error:', e.message); }
  });
}).on('error', (e) => console.log('HTTP-Fehler:', e.message));
