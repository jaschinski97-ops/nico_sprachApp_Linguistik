// Reproducible comparison. Optional AE-31 manifest uses file/word/voice/tone.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const domain = require('./domain.cjs');
const { decodeAudio } = require('./media.cjs');
const { analyzeToneContour } = domain.load('src/lib/speaking/analysis');
const { checkThaiTone, TONE_GATE_LIMITS } = domain.load('src/lib/content/tone-gate');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const { clipIdFor } = domain.load('src/lib/clips/types');
const root = path.resolve(__dirname, '../..');
// Use committed provenance and media, so a fresh checkout needs no local stage.
const probe = JSON.parse(fs.readFileSync(path.join(root, 'content/gemini-probelauf-2026-09-05.json')));
const inputs = probe.entries.filter(entry => entry.kind === 'audio').map(entry => {
  const word = VOCABULARY.find(word => word.language === entry.language && word.term === entry.text);
  return { file: path.join(root, 'assets/content', entry.asset), sha256: entry.sha256, document: {
    id: entry.id, language: entry.language, text: entry.text, kind: word ? 'vocab' : 'example',
    sourceId: word?.id, provider: 'gemini', voice: entry.voice,
  } };
});
const manifest = process.argv[2];
if (manifest) {
  for (const item of JSON.parse(fs.readFileSync(manifest))) {
    const word = VOCABULARY.find(word => word.language === 'th' && word.term === item.word);
    if (!word?.sourceVerified) throw Error('Kein verifizierter Wortbezug: ' + item.word);
    inputs.push({ file: path.resolve(path.dirname(manifest), item.file), sha256: item.sha256, document: {
      id: clipIdFor('th', word.term), sourceId: word.id, text: word.term, language: 'th', kind: 'vocab',
      provider: item.engine, voice: item.voice,
    } });
  }
}
const summary = measurement => ({ status: measurement.status, voicedMs: measurement.voicedMs,
  ...(measurement.summary ? { summary: measurement.summary } : {}) });
const report = { measuredAt: new Date().toISOString(), decoder: 'FFmpeg mono 24 kHz; shared app downsampling to 8 kHz',
  microsoftOriginalClipsAvailable: false,
  microsoftReproductionManifest: manifest ?? null, limitations: TONE_GATE_LIMITS,
  entries: inputs.map(({ file, document, sha256 }) => {
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (sha256 && sha256 !== actualHash) throw Error('Messfixture verändert: ' + path.basename(file));
    const pcm = decodeAudio(file);
    return { file: path.basename(file), sha256: actualHash,
      text: document.text, provider: document.provider, voice: document.voice,
      before: summary(analyzeToneContour(pcm, 24000, undefined, false)),
      after: summary(analyzeToneContour(pcm, 24000)), check: checkThaiTone(document, pcm, 24000) };
  }) };
fs.writeFileSync(path.join(root, 'content/tone-calibration.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.entries.map(entry => ({ text: entry.text, before: entry.before.status,
  after: entry.after.status, slope: entry.after.summary?.slope, check: entry.check.status })), null, 2));
