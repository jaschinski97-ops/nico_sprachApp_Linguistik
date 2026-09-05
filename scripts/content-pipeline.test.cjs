const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ContentPipeline, BUDGET } = require('./content-pipeline.cjs');
const { createStudio } = require('./content-studio.cjs');
const { checkContent } = require('./check-content.cjs');
const domain = require('./content-domain.cjs');
const { clipIdFor } = domain.load('src/lib/clips/types');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const situation = {
  id: 'greeting-A1-de_to_th-001', level: 'A1', topic: 'greeting', direction: 'de_to_th',
  title: 'TEST ONLY', setting: 'Pipeline fixture; never publish to the app.',
  scriptTurns: [{ speaker: 'learner', thai: 'สวัสดี', roman: 'sà-wàt-dii', german: 'Hallo' }],
  corrections: [], generatedAt: 1, modelUsed: 'test-fixture',
};
async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thaispeaker-content-test-'));
  // mkdtemp returns a checked, isolated OS temp child. Never touch the repo.
  assert.equal(path.dirname(root), os.tmpdir());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pipeline = new ContentPipeline(root);
  await fs.mkdir(path.join(root, 'content'), { recursive: true });
  await fs.writeFile(path.join(root, 'content/rejections.json'), '{"version":1,"entries":[]}');
  return { root, pipeline };
}
const approve = (pipeline, entry, extra = {}) => pipeline.review({ kind: entry.kind, id: entry.id, digest: entry.digest, status: 'approved', reviewer: 'AUTOMATED TEST FIXTURE, not a human approval', ...extra });

test('pending excluded; reviewed content published; edits revoke approval; tampering blocks publication', async (t) => {
  const { root, pipeline } = await setup(t);
  const pending = await pipeline.stage({ kind: 'situations', document: situation });
  assert.equal((await pipeline.publish()).entries, 0);
  await assert.rejects(approve(pipeline, pending, { reviewer: '' }), /Prüfername/);
  await assert.rejects(approve(pipeline, pending, { digest: 'stale' }), /erneut/);
  await approve(pipeline, pending);
  assert.equal((await pipeline.publish()).entries, 1);
  const altered = await pipeline.stage({ kind: 'situations', document: { ...situation, setting: 'changed' } });
  assert.equal(altered.review, undefined);
  // Pending replacement does not overwrite the previous human-approved version.
  await pipeline.publish();
  assert.equal((await pipeline.catalog()).entries[0].document.setting, situation.setting);
  await approve(pipeline, altered);
  const state = await pipeline.state();
  state.stage.entries[0].document.setting = 'tampered after review';
  await fs.writeFile(pipeline.stageFile, JSON.stringify(state.stage));
  await assert.rejects(pipeline.publish(), /Prüfsumme/);
  assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  assert.ok(checkContent(root).errors.some((error) => error.includes('Hörclips')));
});

test('individual rejection survives restart and draft deletion; removes an already shipped entry', async (t) => {
  const { root, pipeline } = await setup(t);
  const entry = await pipeline.stage({ kind: 'situations', document: situation });
  await approve(pipeline, entry);
  await pipeline.publish();
  await pipeline.review({ kind: entry.kind, id: entry.id, digest: entry.digest, status: 'rejected', reviewer: 'TEST', reason: 'fixture intentionally rejected' });
  assert.equal((await pipeline.catalog()).entries.length, 0);
  await fs.rm(pipeline.stageFile);
  await assert.rejects(new ContentPipeline(root).stage({ kind: 'situations', document: situation }), /verworfen/);
  const ledger = JSON.parse(await fs.readFile(pipeline.ledgerFile, 'utf8'));
  assert.equal(ledger.entries[0].id, situation.id);
});

test('re-exporting the shipped document replaces a pending edit and retains its exact review', async (t) => {
  const { pipeline } = await setup(t);
  const original = await pipeline.stage({ kind: 'situations', document: situation });
  const reviewed = await approve(pipeline, original);
  await pipeline.publish();
  await pipeline.stage({ kind: 'situations', document: { ...situation, setting: 'pending edit' } });
  const restored = await pipeline.stage({ kind: 'situations', document: situation });
  assert.deepEqual(restored.review, reviewed.review);
  assert.deepEqual((await pipeline.state()).stage.entries, [restored]);
  assert.equal((await pipeline.publish()).pending, 0);
});

test('budget overflow stops the entire publication and preserves the previous catalog', async (t) => {
  const { pipeline } = await setup(t);
  const entry = await pipeline.stage({ kind: 'situations', document: situation });
  await approve(pipeline, entry);
  await pipeline.publish();
  const previous = await fs.readFile(pipeline.catalogFile, 'utf8');
  const state = await pipeline.state();
  // Oversize metadata is enough to exercise the preflight; no 150 MiB fixture
  // needs to be allocated. The old release must remain byte-for-byte intact.
  state.stage.entries[0].byteSize = BUDGET + 1;
  await fs.writeFile(pipeline.stageFile, JSON.stringify(state.stage));
  await assert.rejects(pipeline.publish(), /Kein Teil/);
  assert.equal(await fs.readFile(pipeline.catalogFile, 'utf8'), previous);
});

function wav() {
  const data = Buffer.alloc(44 + 24000 * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(data.length - 44, 40);
  for (let i = 0; i < 24000; i++) data.writeInt16LE(Math.round(8000 * Math.sin(i * 2 * Math.PI * 200 / 24000)), 44 + i * 2);
  return data;
}
test('real encoder, reviewed final MP3 bytes, static require, and missing/corrupt media rejection', async (t) => {
  const { root, pipeline } = await setup(t);
  const bytes = wav();
  const id = clipIdFor('en', 'test');
  const document = { id, language: 'en', text: 'test', kind: 'vocab', sourceId: 'fixture', format: 'wav', byteSize: bytes.length,
    blobKey: id + '.wav', provider: 'gemini', model: 'TEST SINE, NOT PROVIDER SPEECH', voice: 'test', generatedAt: 1, synthetic: true };
  await assert.rejects(pipeline.stage({ kind: 'audio', document }), /fehlt/);
  await assert.rejects(pipeline.stage({ kind: 'audio', document, base64: 'AAAA' }), /Bytezahl/);
  const entry = await pipeline.stage({ kind: 'audio', document, base64: bytes.toString('base64') });
  assert.equal(entry.document.format, 'mp3');
  assert.ok(entry.byteSize < bytes.length / 3);
  const reviewed = await approve(pipeline, entry);
  const stagedAsset = path.join(pipeline.work, entry.asset);
  const encoded = await fs.readFile(stagedAsset);
  for (const damage of ['missing', 'corrupt']) {
    if (damage === 'missing') await fs.rm(stagedAsset);
    else await fs.writeFile(stagedAsset, 'corrupt');
    const restored = await pipeline.stage({ kind: 'audio', document, base64: bytes.toString('base64') });
    assert.deepEqual(restored.review, reviewed.review);
    assert.deepEqual(await fs.readFile(stagedAsset), encoded);
  }
  const report = await pipeline.publish();
  assert.equal(report.audio[0].compressedBytes, (await fs.stat(path.join(root, 'assets/content', entry.asset))).size);
  assert.match(await fs.readFile(path.join(root, 'src/content/assets.ts'), 'utf8'), /require\('\.\.\/\.\.\/assets\/content\/[a-f0-9]{64}\.mp3'\)/);
  assert.deepEqual(checkContent(root, { integrityOnly: true }).errors, []);
  await fs.writeFile(path.join(root, 'assets/content', entry.asset), 'corrupt');
  assert.ok(checkContent(root, { integrityOnly: true }).errors.some((error) => error.includes('geändert')));
});

test('images keep real bytes and concrete-vocabulary gate; rejected image cannot restage', async (t) => {
  const { pipeline } = await setup(t);
  const id = VOCABULARY.find((word) => word.isConcrete).id;
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII=', 'base64');
  const document = { id, vocabId: id, format: 'png', byteSize: bytes.length, blobKey: id + '.png', prompt: 'TEST', model: 'TEST', generatedAt: 1 };
  await assert.rejects(pipeline.stage({ kind: 'images', document: { ...document, id: '../escape' }, base64: bytes.toString('base64') }), /Ungültige/);
  const entry = await pipeline.stage({ kind: 'images', document, base64: bytes.toString('base64') });
  assert.equal(entry.byteSize, bytes.length);
  await pipeline.review({ ...entry, status: 'rejected', reviewer: 'TEST', reason: 'placeholder must not ship' });
  await assert.rejects(pipeline.stage({ kind: 'images', document, base64: bytes.toString('base64') }), /verworfen/);
  await assert.rejects(pipeline.stage({ kind: 'situations', document: { ...situation, apiKey: 'never-export' } }), /Metadaten/);
});

test('loopback API blocks foreign/missing origins and writes only the explicit item', async (t) => {
  const { root } = await setup(t);
  const server = createStudio(root);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const body = JSON.stringify({ kind: 'situations', document: situation });
  for (const origin of [undefined, 'https://attacker.example', 'http://localhost:8083']) {
    const response = await fetch(url + '/stage', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body });
    assert.equal(response.status, 403);
  }
  const response = await fetch(url + '/stage', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' }, body });
  assert.equal(response.status, 200);
  const state = await (await fetch(url + '/state')).json();
  assert.equal(state.stage.entries.length, 1);
  assert.equal(state.shipped.entries.length, 0);
});
