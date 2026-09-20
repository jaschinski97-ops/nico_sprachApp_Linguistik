/** Mechanische Ergänzung vorhandener Vokabeln, ohne KI-Aufruf.
 * Trockenlauf: node scripts/content/fill-exercise-data.cjs
 * Schreiben:  node scripts/content/fill-exercise-data.cjs --write
 * Ausschließlich kuratierte Formen/Lesarten; keine allgemeine Aussprache-Regel.
 */
const verbs = require('../../src/data/german-verb-forms.json');
const groups = require('../../src/data/english-grapheme-groups.json');
const BASE = 'http://127.0.0.1:8082';
const HEADERS = { 'content-type': 'application/json', origin: 'http://localhost:8081' };

function enrich(document) {
  const term = document.term.trim().toLowerCase();
  if (document.language === 'de' && document.partOfSpeech === 'verb' && verbs[term]) {
    return { ...document, germanVerb: verbs[term] };
  }
  if (document.language === 'en' && !document.englishSpelling) {
    for (const group of groups) {
      const variant = group.variants.find(v => new RegExp(v.pattern, 'u').test(term));
      if (variant) return { ...document, englishSpelling: { grapheme: group.grapheme, sound: variant.sound } };
    }
  }
  return document;
}

async function state() {
  const response = await fetch(`${BASE}/state`);
  if (!response.ok) throw Error(`state: ${response.status}`);
  return response.json();
}

async function main() {
  const before = await state();
  const changes = (before.shipped?.entries ?? []).filter(e => e.kind === 'vocabulary')
    .map(e => ({ before: e.document, after: enrich(e.document) }))
    .filter(e => JSON.stringify(e.before) !== JSON.stringify(e.after));
  console.log(JSON.stringify({ mode: process.argv.includes('--write') ? 'write' : 'dry-run',
    germanVerbs: changes.filter(e => e.after.language === 'de').length,
    englishSpelling: changes.filter(e => e.after.language === 'en').length }));
  if (!process.argv.includes('--write') || !changes.length) return;
  const staged = new Map((before.stage?.entries ?? []).filter(e => e.kind === 'vocabulary').map(e => [e.document.id, e.document]));
  for (const { after: document } of changes) {
    if (JSON.stringify(staged.get(document.id)) === JSON.stringify(document)) continue;
    const response = await fetch(`${BASE}/stage`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify({ kind: 'vocabulary', document }),
    });
    if (!response.ok) throw Error(`stage ${document.id}: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  // Ein Verbindungsabbruch beweist keinen fehlgeschlagenen Publish; der
  // gespeicherte Katalog wird unten unabhängig vom HTTP-Ergebnis geprüft.
  try {
    const response = await fetch(`${BASE}/publish`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ vocabularyIds: changes.map(e => e.after.id) }) });
    console.log('publish HTTP', response.status);
    const body = await response.text();
    if (!response.ok) throw Error(body.slice(0, 500));
  } catch (error) { console.log('publish response:', error.message); }
  const after = await state();
  const shipped = new Map((after.shipped?.entries ?? []).filter(e => e.kind === 'vocabulary').map(e => [e.document.id, e.document]));
  const missing = changes.filter(e => {
    const field = e.after.language === 'de' ? 'germanVerb' : 'englishSpelling';
    return JSON.stringify(shipped.get(e.after.id)?.[field]) !== JSON.stringify(e.after[field]);
  });
  if (missing.length) throw Error(`${missing.length} Ergänzungen noch nicht publiziert; /state und Publish-Protokoll prüfen.`);
  console.log(`${changes.length} Ergänzungen im publizierten Katalog verifiziert.`);
}

module.exports = { enrich };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
