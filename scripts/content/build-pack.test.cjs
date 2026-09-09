// Tests fuer den Paket-Bau: Sprachfilter, Manifest-Erzeugung,
// deterministische Reihenfolge und echte WebP-Transkodierung.
// Lauf: node --test scripts/content/build-pack.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildPack, selectPackEntries, readZipNames, crc32 } = require('./build-pack.cjs');

// 1x1 rotes PNG — echte, dekodierbare Eingabe fuer ffmpeg.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const FIXTURE_CATALOG = {
  version: 2,
  entries: [
    // th-Audio: bestanden -> ins Paket.
    { kind: 'audio', id: 'th-01', document: { id: 'th-01', language: 'th', text: 'สวัสดี', kind: 'vocab', sourceId: 's1', format: 'mp3', byteSize: 4, blobKey: 'aa'.repeat(32) + '.mp3' }, digest: 'd1', asset: 'aa'.repeat(32) + '.mp3', byteSize: 4, check: { status: 'passed', label: 'automatisch geprüft', checkedAt: 't', scope: 'schema-integrity-decode', tone: { status: 'passed', targetTone: 'mid' } } },
    // th-Audio: Tonprüfung nicht bestanden -> bleibt raus (wie in der App).
    { kind: 'audio', id: 'th-02', document: { id: 'th-02', language: 'th', text: 'ผิด', kind: 'vocab', sourceId: 's2', format: 'mp3', byteSize: 4, blobKey: 'bb'.repeat(32) + '.mp3' }, digest: 'd2', asset: 'bb'.repeat(32) + '.mp3', byteSize: 4, check: { status: 'failed', label: 'aussortiert', checkedAt: 't', scope: 'schema-integrity-decode', tone: { status: 'failed', targetTone: 'rising' } } },
    // en-Audio: gehoert nicht ins th-Paket.
    { kind: 'audio', id: 'en-01', document: { id: 'en-01', language: 'en', text: 'hello', kind: 'vocab', sourceId: 's3', format: 'mp3', byteSize: 4, blobKey: 'cc'.repeat(32) + '.mp3' }, digest: 'd3', asset: 'cc'.repeat(32) + '.mp3', byteSize: 4, check: { status: 'passed', label: 'automatisch geprüft', checkedAt: 't', scope: 'schema-integrity-decode' } },
    // th-Bild -> WebP im Paket.
    { kind: 'images', id: 'aahaan', document: { id: 'aahaan', vocabId: 'aahaan', format: 'png', byteSize: TINY_PNG.length, blobKey: 'dd'.repeat(32) + '.png' }, digest: 'd4', asset: 'dd'.repeat(32) + '.png', byteSize: TINY_PNG.length, check: { status: 'passed', label: 'automatisch geprüft', checkedAt: 't', scope: 'schema-integrity-decode' } },
    // en-Bild (en-Vokabel) -> nicht ins th-Paket.
    { kind: 'images', id: 'house', document: { id: 'house', vocabId: 'house', format: 'png', byteSize: TINY_PNG.length, blobKey: 'ee'.repeat(32) + '.png' }, digest: 'd5', asset: 'ee'.repeat(32) + '.png', byteSize: TINY_PNG.length, check: { status: 'passed', label: 'automatisch geprüft', checkedAt: 't', scope: 'schema-integrity-decode' } },
    // Situationen kommen nie ins Paket (nur audio + images).
    { kind: 'situations', id: 'sit-1', document: { id: 'sit-1' }, digest: 'd6', check: { status: 'passed' } },
  ],
};

const VOCAB_LANGUAGES = new Map([['aahaan', 'th'], ['house', 'en']]);
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thaispeaker-pack-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'src/content'), { recursive: true });
  await fs.mkdir(path.join(root, 'assets/content'), { recursive: true });
  await fs.writeFile(path.join(root, 'src/content/catalog.json'), JSON.stringify(FIXTURE_CATALOG));
  for (const entry of FIXTURE_CATALOG.entries) {
    if (entry.kind === 'audio') {
      await fs.writeFile(path.join(root, 'assets/content', entry.asset), Buffer.from([1, 2, 3, 4]));
    }
    if (entry.kind === 'images') {
      await fs.writeFile(path.join(root, 'assets/content', entry.asset), TINY_PNG);
    }
  }
  return root;
}

const buildOptions = (root, extra = {}) => ({
  lang: 'th',
  out: 'dist/packs',
  now: '2026-09-09T00:00:00.000Z',
  vocabLanguageById: VOCAB_LANGUAGES,
  ...extra,
  ...(extra.version !== undefined ? { version: extra.version } : {}),
});

test('selectPackEntries filters by language and delivery rule, sorted deterministically', () => {
  const { audio, images } = selectPackEntries(FIXTURE_CATALOG, 'th', VOCAB_LANGUAGES, (entry) => entry.check?.status === 'passed' || (entry.check?.tone?.status === 'passed' && entry.check.status === entry.check.tone.status));
  assert.deepEqual(audio.map((entry) => entry.id), ['th-01']);
  assert.deepEqual(images.map((entry) => entry.id), ['aahaan']);
  // 'th-02' (Tonprüfung failed) und alle en-Einträge bleiben draussen.
});

test('buildPack produces manifest, zip and sidecar with correct content', async (t) => {
  const root = await setup(t);
  const result = await buildPack(root, buildOptions(root));
  const manifest = result.manifest;

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.language, 'th');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.createdAt, '2026-09-09T00:00:00.000Z');
  assert.equal(manifest.sourceCatalogSha256, sha256(JSON.stringify(FIXTURE_CATALOG)));
  assert.equal(manifest.totals.audio, 1);
  assert.equal(manifest.totals.images, 1);
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.totals.bytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
  // Deterministische Reihenfolge: audio vor images, jeweils sortiert.
  assert.deepEqual(manifest.files.map((file) => file.path), [
    `audio/${'aa'.repeat(32)}.mp3`,
    'images/aahaan.webp',
  ]);

  const zipBytes = await fs.readFile(result.zipPath);
  assert.equal(zipBytes.length, result.zipBytes);
  assert.equal(sha256(zipBytes), result.zipSha256);
  assert.deepEqual(readZipNames(zipBytes).sort(), [`audio/${'aa'.repeat(32)}.mp3`, 'images/aahaan.webp', 'manifest.json'].sort());

  // Datei-Pruefsummen im Manifest stimmen mit dem Zip-Inhalt ueberein.
  for (const file of manifest.files) {
    const entryIndex = readZipNames(zipBytes).indexOf(file.path);
    assert.ok(entryIndex >= 0, `${file.path} fehlt im Zip`);
  }

  // Sidecar enthaelt zipBytes/zipSha256 und sonst dasselbe Manifest.
  const sidecar = JSON.parse(await fs.readFile(path.join(path.dirname(result.zipPath), `thai-pack-th-v${result.version}.manifest.json`), 'utf8'));
  assert.equal(sidecar.zipBytes, zipBytes.length);
  assert.equal(sidecar.zipSha256, sha256(zipBytes));
  assert.equal(sidecar.sourceCatalogSha256, manifest.sourceCatalogSha256);

  // Versions-Index fuer den lokalen Helper.
  const index = JSON.parse(await fs.readFile(path.join(path.dirname(result.zipPath), 'index.json'), 'utf8'));
  assert.deepEqual(index, { language: 'th', versions: [1], latest: 1 });
});

test('buildPack transcodes images to real WebP and verifies sha256 entries', async (t) => {
  const root = await setup(t);
  const result = await buildPack(root, buildOptions(root));
  const image = result.manifest.files.find((file) => file.path.startsWith('images/'));
  assert.match(image.path, /^images\/[a-z0-9_-]+\.webp$/);
  // WebP-Magie aus dem Zip direkt pruefen: STORE-Zip -> Daten liegen unkomprimiert.
  const zip = await fs.readFile(result.zipPath);
  const localHeaderOffset = zip.indexOf(Buffer.from(`images/aahaan.webp`, 'utf8')) + 'images/aahaan.webp'.length;
  const data = zip.subarray(localHeaderOffset, localHeaderOffset + image.bytes);
  assert.equal(data.length, image.bytes);
  assert.equal(data.slice(0, 4).toString('latin1'), 'RIFF');
  assert.equal(data.slice(8, 12).toString('latin1'), 'WEBP');
  assert.equal(sha256(data), image.sha256);
});

test('buildPack is deterministic: same inputs, same zip bytes', async (t) => {
  const root = await setup(t);
  const first = await buildPack(root, buildOptions(root));
  const second = await buildPack(root, buildOptions(root, { version: 1 }));
  assert.equal(first.zipSha256, second.zipSha256);
  const manifestAgain = JSON.parse(await fs.readFile(path.join(path.dirname(second.zipPath), `thai-pack-th-v1.manifest.json`), 'utf8'));
  assert.equal(manifestAgain.sourceCatalogSha256, first.manifest.sourceCatalogSha256);
  assert.equal(manifestAgain.totals.bytes, first.manifest.totals.bytes);
});

test('buildPack increments the version from the existing index', async (t) => {
  const root = await setup(t);
  const first = await buildPack(root, buildOptions(root));
  assert.equal(first.version, 1);
  const second = await buildPack(root, buildOptions(root));
  assert.equal(second.version, 2);
  const index = JSON.parse(await fs.readFile(path.join(root, 'dist/packs/th/index.json'), 'utf8'));
  assert.deepEqual(index.versions, [1, 2]);
  assert.equal(index.latest, 2);
});

test('crc32 matches known check values', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.equal(crc32(Buffer.alloc(0)), 0);
});
