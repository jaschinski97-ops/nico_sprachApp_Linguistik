/**
 * Manuelle Prüfungs-Pflege (Phase 2, Schritt 3).
 *
 * content/exam/manual/*.json — je Datei ein vollständiges ExamModule mit
 * `source: 'manual'`, von Hand gepflegt bzw. durch die 1:1-Übertragung
 * entstanden. Der Merge prüft jedes Dokument (`isValidExamModule`) und
 * schreibt die GENERIERTE Datei src/data/exam-modules-manual.ts, deren
 * MANUAL_EXAM_MODULES zusammen mit den mitgelieferten Modulen ausgeliefert
 * wird (GEBUENDELTE_EXAM_MODULES).
 *
 *   node scripts/content/exam-manual.cjs validate   — nur prüfen
 *   node scripts/content/exam-manual.cjs merge      — prüfen + bündeln
 */
const fs = require('node:fs');
const path = require('node:path');
const domain = require('./domain.cjs');
const { isValidExamModule } = domain.load('src/lib/exam/types');

const ORDNER = ['content', 'exam', 'manual'];
const ZIEL = ['src', 'data', 'exam-modules-manual.ts'];

function liesModule(root) {
  const dir = path.join(root, ...ORDNER);
  if (!fs.existsSync(dir)) return [];
  const dateien = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const module = [];
  for (const datei of dateien) {
    const voll = path.join(dir, datei);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(voll, 'utf8')); }
    catch (e) { throw Error(`${datei}: ungültiges JSON (${e.message})`); }
    if (!isValidExamModule(doc)) throw Error(`${datei}: verletzt den ExamModule-Vertrag.`);
    if (doc.source !== 'manual') throw Error(`${datei}: source muss 'manual' sein.`);
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(doc.id)) throw Error(`${datei}: ungültige ID.`);
    if (module.some((m) => m.id === doc.id)) throw Error(`${datei}: ID doppelt (${doc.id}).`);
    module.push(doc);
  }
  return module;
}

function merge(root) {
  const module = liesModule(root);
  const kopf = fs.readFileSync(path.join(__dirname, 'exam-manual-kopf.txt'), 'utf8');
  const koerper = module
    .map((m) => `  ${JSON.stringify(m, null, 2).replace(/\n/g, '\n  ')},`)
    .join('\n');
  const quelle =
    kopf + '\n' +
    'import { ExamModule } from \'@/lib/exam/types\';\n\n' +
    'export const MANUAL_EXAM_MODULES: ExamModule[] = [\n' +
    (module.length ? koerper + '\n' : '') +
    '];\n';
  const ziel = path.join(root, ...ZIEL);
  const vorher = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : '';
  if (vorher !== quelle) {
    const temp = ziel + '.tmp';
    fs.writeFileSync(temp, quelle);
    fs.renameSync(temp, ziel);
  }
  return module.length;
}

const befehl = process.argv[2] ?? 'merge';
const root = path.resolve(__dirname, '../..');
if (befehl === 'validate') {
  const n = liesModule(root);
  console.log(`exam-manual: ${n} Modul(e) geprüft, keine Fehler.`);
} else if (befehl === 'merge') {
  console.log(`exam-manual: ${merge(root)} Modul(e) gebündelt.`);
} else {
  console.error('Usage: node scripts/content/exam-manual.cjs validate|merge');
  process.exit(1);
}
module.exports = { liesModule, merge };
