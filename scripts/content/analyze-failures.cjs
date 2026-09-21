#!/usr/bin/env node
// Einmal-Auswertung von pipeline/logs/studio-failures.ndjson (read-only) + Helper-/state-Bestand.
// Kein Schreibzugriff auf Pipeline/Stage/Katalog.

const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', '..', 'pipeline', 'logs', 'studio-failures.ndjson');

const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean);
const entries = [];
for (const line of lines) {
  try { entries.push(JSON.parse(line)); } catch { /* kaputte Zeile ignorieren */ }
}

const byKind = {};
const byKindLang = {};
const uniqueTerms = {};
for (const e of entries) {
  byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const k = `${e.kind}|${e.language || '?'}`;
  byKindLang[k] = (byKindLang[k] || 0) + 1;
  if (e.kind === 'kreuzpruefung') {
    const key = e.language || '?';
    uniqueTerms[key] = uniqueTerms[key] || new Set();
    uniqueTerms[key].add((e.term || '').toLowerCase());
  }
}

console.log('=== GESAMT ===');
console.log('Zeitraum:', entries[0]?.loggedAt, '->', entries[entries.length - 1]?.loggedAt);
console.log('Eintraege:', entries.length);
console.log('Je Art:', JSON.stringify(byKind, null, 0));
console.log('Je Art|Sprache:');
for (const k of Object.keys(byKindLang).sort()) console.log('  ', k, byKindLang[k]);
console.log('Eindeutige abgelehnte Begriffe (kreuzpruefung):');
for (const k of Object.keys(uniqueTerms)) console.log('  ', k, uniqueTerms[k].size);

// Kreuzpruefungs-Gruende kategorisieren (Keywords, ein Grund kann in mehrere Kategorien fallen)
const RULES = [
  ['ipa/lautschrift/umschrift', /(ipa|lautschrift|umschrift|phonetik|transkription|\/.*\/|aussprache)/i],
  ['beispielssatz', /(beispiels|beispielssatz|satz wirkt|unnatürlich|ungewöhnlich|idiomat)/i],
  ['uebersetzung/bedeutung', /(übersetz|bedeutung|semant|nicht alle bedeutungen|mehrdeutig|doppelbedeutung)/i],
  ['nicht hochfrequent/alltag', /(hochfrequen|alltags|grundbegriff|grundwortschatz|selten|speziell|fachbegriff|veraltet|formell)/i],
  ['grammatik/struktur', /(grammatik|wortart|genus|artikel|plural|konjugation|adverb|adjektiv|substantiv|verb)/i],
  ['ton/silben', /(ton|silbe|betonung|tonfall|kontur)/i],
  ['natürlichkeit/formulierung', /(natürlicher|gängiger|besser|unklar|nicht klar|verwirrend)/i],
  ['rechtschreibung', /(rechtschreib|schreibweise|orthograf)/i],
];
const catCount = {};
const catExamples = {};
for (const e of entries) {
  if (e.kind !== 'kreuzpruefung') continue;
  const reasons = String(e.gruende || '').split(/\s*\|\s*/).filter(Boolean);
  const hit = new Set();
  for (const r of reasons) {
    for (const [name, re] of RULES) {
      if (re.test(r)) {
        hit.add(name);
        if (!catExamples[name]) catExamples[name] = [];
        if (catExamples[name].length < 6) catExamples[name].push(`${e.language}: ${e.term} — ${r.slice(0, 160)}`);
      }
    }
  }
  for (const name of hit) catCount[name] = (catCount[name] || 0) + 1;
}
console.log('\n=== KREUZPRUEFUNGS-GRUENDE (kategorisiert, Wort kann mehrfach zaehlen) ===');
const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
for (const [name, n] of sorted) {
  console.log(`\n[${name}] ${n}x`);
  for (const ex of catExamples[name].slice(0, 3)) console.log('   ', ex);
}

// Schema-Fehler
const schemaReasons = {};
const schemaExamples = [];
for (const e of entries) {
  if (e.kind !== 'schema') continue;
  const r = String(e.pruefFehler || e.gruende || e.fehler || '?');
  schemaReasons[r] = (schemaReasons[r] || 0) + 1;
  if (schemaExamples.length < 10) schemaExamples.push(`${e.language}: ${r.slice(0, 200)}`);
}
if (Object.keys(schemaReasons).length) {
  console.log('\n=== SCHEMA-FEHLER ===');
  for (const [r, n] of Object.entries(schemaReasons).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n}x ${r.slice(0, 180)}`);
}

// Blacklist
const bl = entries.filter(e => e.kind === 'blacklist');
if (bl.length) {
  console.log('\n=== BLACKLIST-TREFFER (Phase A Skip) ===');
  const blTerms = {};
  for (const e of bl) blTerms[e.language || '?'] = (blTerms[e.language || '?'] || 0) + 1;
  console.log('  Je Sprache:', JSON.stringify(blTerms));
}

// Paket-Fehler (hart!)
const paket = entries.filter(e => e.kind === 'paket');
if (paket.length) {
  console.log('\n=== PAKET-FEHLER (hart) ===');
  for (const e of paket.slice(0, 20)) console.log(`  ${e.loggedAt} ${e.language || '?'}: ${String(e.fehler || e.gruende || '?').slice(0, 250)}`);
}

// Zeitverteilung je Sprache (Stunden-Buckets)
const perHour = {};
for (const e of entries) {
  if (!e.loggedAt) continue;
  const h = e.loggedAt.slice(5, 13); // MM-DDTHH
  const k = `${e.language || '?'} ${h}`;
  perHour[k] = (perHour[k] || 0) + 1;
}
console.log('\n=== FEHLSCHLÄGE JE SPRACHE+STUNDE (nur Ausreißer >60) ===');
for (const k of Object.keys(perHour).sort()) if (perHour[k] > 60) console.log('  ', k, perHour[k]);
