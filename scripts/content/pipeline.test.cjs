const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ContentPipeline, BUDGET } = require('./pipeline.cjs');
const { createStudio } = require('./studio.cjs');
const { checkContent } = require('./check.cjs');
const domain = require('./domain.cjs');
const { clipIdFor } = domain.load('src/lib/clips/types');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const { analyzeToneContour } = domain.load('src/lib/speaking/analysis');
const { decodeAudio } = require('./media.cjs');
const situation = {
  id: 'greeting-A1-de_to_th-001', level: 'A1', topic: 'greeting', direction: 'de_to_th',
  title: 'TEST ONLY', setting: 'Pipeline fixture; never publish to the app.',
  scriptTurns: [{ speaker: 'learner', thai: 'สวัสดี', roman: 'sà-wàt-dii', german: 'Hallo' }],
  corrections: [], generatedAt: 1, modelUsed: 'test-fixture',
};
async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thaispeaker-content-test-'));
  assert.equal(path.dirname(root), os.tmpdir());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, pipeline: new ContentPipeline(root) };
}
function wav(start = 200, end = start) {
  const data = Buffer.alloc(44 + 24000 * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(data.length - 44, 40);
  let phase = 0;
  for (let i = 0; i < 24000; i++) {
    phase += 2 * Math.PI * (start + (end - start) * i / 24000) / 24000;
    data.writeInt16LE(Math.round(8000 * Math.sin(phase)), 44 + i * 2);
  }
  return data;
}
function audio(bytes, word, language = 'th') {
  const text = word?.term ?? 'test'; const id = clipIdFor(language, text);
  return { kind: 'audio', document: { id, language, text, kind: 'vocab', sourceId: word?.id ?? 'fixture',
    format: 'wav', byteSize: bytes.length, blobKey: id + '.wav', provider: 'gemini', model: 'TEST SINE, NOT SPEECH',
    voice: 'test', generatedAt: 1, synthetic: true }, base64: bytes.toString('base64') };
}
test('automatic publication, schema, re-export and metadata tampering with no review method', async (t) => {
  const { root, pipeline } = await setup(t);
  assert.equal(pipeline.review, undefined);
  const entry = await pipeline.stage({ kind: 'situations', document: situation });
  assert.equal(entry.check.status, 'passed');
  assert.equal((await pipeline.publish()).entries, 1);
  await pipeline.stage({ kind: 'situations', document: { ...situation, setting: 'changed' } });
  await pipeline.publish(); assert.equal((await pipeline.catalog()).entries[0].document.setting, 'changed');
  const state = await pipeline.state(); state.stage.entries[0].document.setting = 'tampered';
  await fs.writeFile(pipeline.stageFile, JSON.stringify(state.stage));
  await assert.rejects(pipeline.publish(), /Prüfsumme/);
  assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  assert.ok(checkContent(root).errors.some(error => error.includes('Hörclips')));
  await assert.rejects(pipeline.stage({ kind: 'situations', document: { ...situation, apiKey: 'never-export' } }), /Metadaten/);
});
test('tone failures and unchecked material stay out; regeneration is never permanently blocked', async (t) => {
  const { root, pipeline } = await setup(t);
  const word = VOCABULARY.find(word => word.id === 'kha');
  const wrong = await pipeline.stage(audio(wav(120, 240), word));
  assert.equal(wrong.check.tone.status, 'failed'); assert.equal((await pipeline.publish()).entries, 0);
  const right = await pipeline.stage(audio(wav(240, 120), word));
  assert.equal(right.check.tone.status, 'passed'); assert.equal((await pipeline.publish()).entries, 1);
  const multi = VOCABULARY.find(word => word.id === 'sawatdii');
  assert.equal((await pipeline.stage(audio(wav(), multi))).check.status, 'unchecked');
  const report = await pipeline.publish(); assert.equal(report.entries, 1); assert.equal(report.unchecked, 1);
  assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  await pipeline.stage(audio(wav(120, 240), word)); await pipeline.publish();
  assert.equal((await pipeline.catalog()).entries.length, 0);
  const measurements = JSON.parse(await fs.readFile(pipeline.reportFile));
  assert.equal(measurements.entries.find(entry => entry.id === wrong.id).tone.targetTone, 'falling');
});
test('budget overflow leaves the complete previous catalog unchanged', async (t) => {
  const { pipeline } = await setup(t);
  await pipeline.stage({ kind: 'situations', document: situation }); await pipeline.publish();
  const previous = await fs.readFile(pipeline.catalogFile, 'utf8');
  const state = await pipeline.state(); state.stage.entries[0].byteSize = BUDGET + 1;
  await fs.writeFile(pipeline.stageFile, JSON.stringify(state.stage));
  await assert.rejects(pipeline.publish(), /Kein Teil/);
  assert.equal(await fs.readFile(pipeline.catalogFile, 'utf8'), previous);
});
test('real MP3 encode/decode, content hash, static assets and corrupt-media repair', async (t) => {
  const { root, pipeline } = await setup(t); const input = audio(wav(), undefined, 'en');
  await assert.rejects(pipeline.stage({ ...input, base64: 'AAAA' }), /Bytezahl/);
  const entry = await pipeline.stage(input); assert.ok(entry.byteSize < input.document.byteSize / 3);
  const staged = path.join(pipeline.work, entry.asset); const encoded = await fs.readFile(staged);
  for (const damage of ['missing', 'corrupt']) {
    if (damage === 'missing') await fs.rm(staged); else await fs.writeFile(staged, 'corrupt');
    await pipeline.stage(input); assert.deepEqual(await fs.readFile(staged), encoded);
  }
  await pipeline.publish(); assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  assert.match(await fs.readFile(path.join(root, 'src/content/assets.ts'), 'utf8'), /require\('\.\.\/\.\.\/assets\/content\/[a-f0-9]{64}\.mp3'\)/);
  await fs.writeFile(path.join(root, 'assets/content', entry.asset), 'corrupt');
  assert.ok(checkContent(root, { integrityOnly: true }).errors.some(error => error.includes('geändert')));
});
test('images require real decoding and concrete-word schema', async (t) => {
  const { root, pipeline } = await setup(t); const id = VOCABULARY.find(word => word.isConcrete).id;
  const bytes = await fs.readFile(path.join(__dirname, '../../assets/images/icon.png'));
  const document = { id, vocabId: id, format: 'png', byteSize: bytes.length, blobKey: id + '.png', prompt: 'TEST', model: 'TEST', generatedAt: 1 };
  await assert.rejects(pipeline.stage({ kind: 'images', document: { ...document, id: '../escape' }, base64: bytes.toString('base64') }), /Ungültige/);
  const entry = await pipeline.stage({ kind: 'images', document, base64: bytes.toString('base64') });
  assert.equal(entry.byteSize, bytes.length); await pipeline.publish();
  assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  const broken = Buffer.from('89504e470d0a1a0a', 'hex');
  await assert.rejects(pipeline.stage({ kind: 'images', document: { ...document, byteSize: broken.length }, base64: broken.toString('base64') }));
});
test('loopback API origin protections and removal of the review endpoint', async (t) => {
  const { root } = await setup(t); const server = createStudio(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const body = JSON.stringify({ kind: 'situations', document: situation });
  for (const origin of [undefined, 'https://attacker.example', 'http://localhost:8083']) {
    assert.equal((await fetch(url + '/stage', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body })).status, 403);
  }
  const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' };
  assert.equal((await fetch(url + '/review', { method: 'POST', headers, body })).status, 404);
  assert.equal((await fetch(url + '/stage', { method: 'POST', headers, body })).status, 200);
  assert.equal((await fetch(url + '/publish', { method: 'POST', headers, body: '{}' })).status, 200);
  assert.equal((await (await fetch(url + '/state')).json()).shipped.entries.length, 1);
});
test('real short dead syllable: strict threshold loses the fall, continuity recovers it', async () => {
  const pcm = decodeAudio(path.join(__dirname, '../../assets/content/16440f54287a4d83aa57d3a98bcefcf9b8512489e88b49c76ad6397e3c94cd89.mp3'));
  assert.equal(analyzeToneContour(pcm, 24000, undefined, false).status, 'unmeasurable');
  const corrected = analyzeToneContour(pcm, 24000); assert.equal(corrected.status, 'measured');
  assert.ok(corrected.summary.slope < -4.5 && corrected.summary.slope > -6);
  assert.ok(corrected.summary.durMs >= 100);
});

test('AE-31 reproduction: every previously measurable Microsoft contour remains unchanged', async () => {
  const manifest = require('./fixtures/tones/index.json');
  const { checkThaiTone } = domain.load('src/lib/content/tone-gate');
  for (const item of manifest) {
    const file = path.join(__dirname, 'fixtures/tones', item.file);
    const bytes = await fs.readFile(file);
    assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), item.sha256);
    const pcm = decodeAudio(file);
    const before = analyzeToneContour(pcm, 24000, undefined, false);
    const after = analyzeToneContour(pcm, 24000);
    assert.equal(before.status, 'measured');
    assert.deepEqual(after, before, item.file);
    const word = VOCABULARY.find(word => word.language === 'th' && word.term === item.word);
    const result = checkThaiTone(audio(wav(), word).document, pcm, 24000);
    assert.equal(result.status, ['falling', 'rising'].includes(item.tone) ? 'passed' : 'unchecked', item.file);
  }
});
