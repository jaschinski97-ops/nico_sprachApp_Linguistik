const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { writeProtocol } = require('./protocol.cjs');

async function tempRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thaispeaker-protocol-test-'));
  assert.equal(path.dirname(root), os.tmpdir());
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('writeProtocol schreibt ein JSON je Lauf und eine NDJSON-Zeile', async (t) => {
  const root = await tempRoot(t);
  const { file, index } = writeProtocol({
    script: 'generate-audio',
    action: 'tts-batch',
    model: 'gpt-4o-mini-tts-2025-12-15',
    voice: 'coral',
    items: 12,
    costEstimateUsd: 0.42,
    checks: { failed: 0 },
    result: 'ok',
    notes: 'Testlauf',
  }, { root });
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(record.script, 'generate-audio');
  assert.equal(record.action, 'tts-batch');
  assert.equal(record.model, 'gpt-4o-mini-tts-2025-12-15');
  assert.equal(record.voice, 'coral');
  assert.equal(record.items, 12);
  assert.equal(record.costEstimateUsd, 0.42);
  assert.deepEqual(record.checks, { failed: 0 });
  assert.equal(record.result, 'ok');
  assert.equal(record.protocolVersion, 1);
  assert.doesNotThrow(() => new Date(record.loggedAt), 'loggedAt muss ISO-Zeitstempel sein');
  assert.match(record.loggedAt, /^\d{4}-\d{2}-\d{2}T/);
  const lines = (await fs.readFile(index, 'utf8')).trim().split('\n');
  assert.equal(lines.length, 1);
  const line = JSON.parse(lines[0]);
  assert.equal(line.script, 'generate-audio');
  assert.equal(line.action, 'tts-batch');
  assert.equal(line.result, 'ok');
  assert.equal(line.file, path.basename(file));
  assert.match(file, /pipeline[\\/]logs[\\/]\d{4}-\d{2}-\d{2}-generate-audio-tts-batch(-\d+)?\.json$/);
});

test('mehrere Läufe gleichen Namens kollidieren nicht: laufende Nummer, ndjson wächst', async (t) => {
  const root = await tempRoot(t);
  const first = writeProtocol({ script: 'measure-tones', action: 'measure', items: 1, result: 'ok' }, { root });
  const second = writeProtocol({ script: 'measure-tones', action: 'measure', items: 2, result: 'ok' }, { root });
  assert.notEqual(first.file, second.file);
  assert.match(second.file, /-2\.json$/);
  const lines = (await fs.readFile(first.index, 'utf8')).trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]).items, 2);
  // Bestehende Dateien werden nie überschrieben oder angetastet.
  const firstRecord = JSON.parse(await fs.readFile(first.file, 'utf8'));
  assert.equal(firstRecord.items, 1);
});

test('unsichere Namen werden neutralisiert und Pflichtfelder geprüft', async (t) => {
  const root = await tempRoot(t);
  const { file } = writeProtocol({ script: 'mein skript/v2', action: 'lauf nr 1', result: 'ok' }, { root });
  assert.match(path.basename(file), /^[\d-]+-mein-skript-v2-lauf-nr-1(-\d+)?\.json$/);
  assert.throws(() => writeProtocol({ action: 'x' }, { root }), /script/);
  assert.throws(() => writeProtocol({ script: 'x' }, { root }), /action/);
});
