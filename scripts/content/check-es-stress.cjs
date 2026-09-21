#!/usr/bin/env node
// Wie sehen BESTANDENE es-Vokabeln aus: romanization (Apostroph?) + syllables (stressed-Feld?).
const fs = require('fs');
const path = require('path');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'content', 'catalog.json'), 'utf8'));
const vocab = (cat.entries || []).filter((e) => e.kind === 'vocabulary');
const es = vocab.filter((e) => (e.document?.language || '') === 'es');
let withApostroph = 0, withoutApostroph = 0, stressedField = 0, noStressed = 0, noSyll = 0;
const samples = [];
for (const e of es) {
  const d = e.document || {};
  const ro = String(d.romanization || '');
  if (ro.includes("'")) withApostroph++; else withoutApostroph++;
  if (Array.isArray(d.syllables) && d.syllables.length) {
    if (d.syllables.some((s) => s && typeof s === 'object' && (s.stressed !== undefined || s.tone !== undefined))) stressedField++;
    else noStressed++;
    if (samples.length < 5) samples.push({ term: d.term, romanization: ro, syllables: d.syllables });
  } else noSyll++;
}
console.log('es-Vokabeln im Katalog:', es.length);
console.log('romanization MIT Apostroph:', withApostroph, '| OHNE:', withoutApostroph);
console.log('syllables als Objekte (stress/tone-Feld):', stressedField, '| als Strings:', noStressed, '| ohne syllables:', noSyll);
console.log('Stichproben:');
for (const s of samples) console.log(' ', JSON.stringify(s));
// Vergleich de/en kurz
for (const lang of ['de', 'en']) {
  const l = vocab.filter((e) => (e.document?.language || '') === lang);
  console.log(`${lang}: ${l.length} Eintraege, Stichprobe-Romanization:`, l.slice(0, 3).map((e) => e.document.romanization));
}
