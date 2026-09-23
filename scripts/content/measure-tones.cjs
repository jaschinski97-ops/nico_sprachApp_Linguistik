// Reproducible comparison. Optional AE-31 manifest uses file/word/voice/tone.
//
// GEGENMESSUNG UEBER ALLE VORHANDENEN AUDIOS (seit der Katalog-Phase):
// 1. Der ausgelieferte Katalog (src/content/catalog.json -> assets/content/) —
//    immer gemessen, damit der Bestand, den Nutzer hoeren, gegen denselben
//    Messkern geprueft wird wie neue Clips.
// 2. Unveroeffentlichte Studio-Entwuerfe (.content-studio/stage.json), soweit
//    ihre Datei noch liegt und nicht schon im Katalog steht — hier sitzen die
//    Clips, die den Ton-Gate beim Publish nicht bestanden haben.
// 3. Optional ein Manifest (argv, Felder file/word/engine/voice/sha256) fuer
//    Fremdproben, z.B. scripts/content/fixtures/tones/index.json.
//
// Die alte Festprobengruppe (gemini-probelauf-2026-09-05) ist abgeloesst:
// fuenf ihrer zehn Dateien wurden zwischenzeitlich regeneriert, der Katalog
// enthaelt dieselben Texte mit aktuellen Dateien.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const domain = require('./domain.cjs');
const { decodeAudio } = require('./media.cjs');
const { analyzeToneContour } = domain.load('src/lib/speaking/analysis');
const { checkThaiTone, TONE_GATE_LIMITS } = domain.load('src/lib/content/tone-gate');
// Die AE-31-Fixture-Manifeste (มา & Co.) beziehen sich auf den früheren,
// quellengeprüften Grundstock — der lebt nur noch als Testdatensatz.
const { VOCABULARY } = domain.load('src/test-fixtures/legacy-vocabulary');
const { clipIdFor } = domain.load('src/lib/clips/types');
const { tryWriteProtocol } = require('../pipeline/protocol.cjs');
const root = path.resolve(__dirname, '../..');

const inputs = [];
const seenFiles = new Set();
const sources = { catalog: 0, staged: 0, manifest: 0, missingFiles: 0 };

function addInput(file, sha256, document, source) {
  if (!fs.existsSync(file)) {
    sources.missingFiles += 1;
    return;
  }
  const key = path.basename(file);
  if (seenFiles.has(key)) return;
  seenFiles.add(key);
  sources[source] += 1;
  inputs.push({ file, sha256, document });
}

function documentOfEntry(entry) {
  const doc = entry.document ?? {};
  return {
    id: doc.id, language: doc.language, text: doc.text,
    kind: doc.kind, sourceId: doc.sourceId,
    provider: doc.provider, voice: doc.voice,
  };
}

const catalogFile = path.join(root, 'src/content/catalog.json');
if (fs.existsSync(catalogFile)) {
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  for (const entry of catalog.entries) {
    if (entry.kind !== 'audio' || !entry.asset) continue;
    addInput(path.join(root, 'assets/content', entry.asset),
      String(entry.asset).replace(/\.[a-z0-9]+$/i, ''), documentOfEntry(entry), 'catalog');
  }
}

const stageFile = path.join(root, '.content-studio/stage.json');
if (fs.existsSync(stageFile)) {
  const stage = JSON.parse(fs.readFileSync(stageFile, 'utf8'));
  for (const entry of stage.entries) {
    if (entry.kind !== 'audio' || !entry.asset) continue;
    addInput(path.join(root, '.content-studio', entry.asset),
      String(entry.asset).replace(/\.[a-z0-9]+$/i, ''), documentOfEntry(entry), 'staged');
  }
}

// 18.09.: Solltöne je Silbe aus dem Wortschatz von Katalog und Stage — das
// Grundstock-VOCABULARY bleibt vorne, damit die Fixture-Manifeste (มา & Co.)
// weiter ihren Einsilber-Bezug finden.
const toneWortschatz = [...VOCABULARY];
for (const quelle of [catalogFile, stageFile]) {
  if (!fs.existsSync(quelle)) continue;
  for (const entry of JSON.parse(fs.readFileSync(quelle, 'utf8')).entries) {
    if (entry.kind === 'vocabulary') toneWortschatz.push(entry.document);
  }
}

const manifest = process.argv[2];
if (manifest) {
  for (const item of JSON.parse(fs.readFileSync(manifest))) {
    const word = VOCABULARY.find(word => word.language === 'th' && word.term === item.word);
    if (!word?.sourceVerified) throw Error('Kein verifizierter Wortbezug: ' + item.word);
    addInput(path.resolve(path.dirname(manifest), item.file), item.sha256, {
      id: clipIdFor('th', word.term), sourceId: word.id, text: word.term, language: 'th', kind: 'vocab',
      provider: item.engine, voice: item.voice,
    }, 'manifest');
  }
}

const summary = measurement => ({ status: measurement.status, voicedMs: measurement.voicedMs,
  ...(measurement.summary ? { summary: measurement.summary } : {}) });
const report = { measuredAt: new Date().toISOString(), decoder: 'FFmpeg mono 24 kHz; shared app downsampling to 8 kHz',
  sources, microsoftOriginalClipsAvailable: false,
  microsoftReproductionManifest: manifest ?? null, limitations: TONE_GATE_LIMITS,
  entries: inputs.map(({ file, document, sha256 }) => {
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (sha256 && sha256 !== actualHash) throw Error('Datei veraendert (Hash weicht ab): ' + path.basename(file));
    // Ein einzelner undekodierbarer Clip darf die Messung nicht komplett
    // verhindern — er landet als Fehler im Bericht.
    let pcm;
    try { pcm = decodeAudio(file); }
    catch (error) {
      return { file: path.basename(file), sha256: actualHash, text: document.text, provider: document.provider,
        voice: document.voice, error: String(error.message ?? error).split('\n')[0],
        before: { status: 'error' }, after: { status: 'error' },
        check: { status: document.language === 'th' ? 'unchecked' : 'not-applicable', reason: 'Dekodierung fehlgeschlagen.' } };
    }
    return { file: path.basename(file), sha256: actualHash,
      text: document.text, provider: document.provider, voice: document.voice,
      before: summary(analyzeToneContour(pcm, 24000, undefined, false)),
      after: summary(analyzeToneContour(pcm, 24000)),
      check: checkThaiTone(document, pcm, 24000, { woerter: toneWortschatz }, { track: true }) };
  }) };
const reportsDir = path.join(root, 'pipeline/reports');
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'tone-calibration.json'), JSON.stringify(report, null, 2) + '\n');

const thai = report.entries.filter(entry => entry.check.status !== 'not-applicable');
const counts = {};
for (const entry of thai) counts[entry.check.status] = (counts[entry.check.status] ?? 0) + 1;
tryWriteProtocol({
  script: 'measure-tones',
  action: 'measure',
  items: report.entries.length,
  checks: { sources, thaiCounts: counts },
  result: 'ok',
  notes: `Katalog ${sources.catalog}, Entwürfe ${sources.staged}, Manifest ${sources.manifest}, fehlende Dateien ${sources.missingFiles}`,
});
console.log(`Gegenmessung: ${report.entries.length} Audios gemessen (Katalog ${sources.catalog}, Entwuerfe ${sources.staged}, Manifest ${sources.manifest}, fehlende Dateien ${sources.missingFiles}), davon ${thai.length} Thai.`);
console.log('Thai nach Gate-Status:', JSON.stringify(counts));
console.log('Nicht bestanden / ungeprueft (Thai):');
for (const entry of thai) {
  if (entry.check.status === 'passed') continue;
  console.log(`  ${entry.check.status.padEnd(9)} ${entry.text}  ${entry.check.targetTone ?? entry.check.targetTones?.join('/') ?? '-'}  slope=${entry.after.summary ? entry.after.summary.slope.toFixed(2) : '-'}  ${entry.file}  ${entry.check.reason}`);
}
console.log('Bestanden (Thai): ' + thai.filter(entry => entry.check.status === 'passed').map(entry => entry.text).join(', '));
