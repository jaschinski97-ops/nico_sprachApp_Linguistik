const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { loadEnvLocal } = require('./env.cjs');

test('loadEnvLocal füllt leere Variablen, echte env gewinnt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envtest-'));
  fs.writeFileSync(
    path.join(root, '.env.local'),
    '# Kommentar\nFOO_TEST_A=bar\nFOO_TEST_B="baz"\nFOO_TEST_C=existiert\n\nkein gleichheitszeichen\n'
  );
  process.env.FOO_TEST_C = 'echt';
  delete process.env.FOO_TEST_A;
  process.env.FOO_TEST_B = '';
  const loaded = loadEnvLocal({ root });
  assert.ok(loaded.includes('FOO_TEST_A'));
  assert.strictEqual(process.env.FOO_TEST_A, 'bar');
  assert.strictEqual(process.env.FOO_TEST_B, 'baz');
  assert.strictEqual(process.env.FOO_TEST_C, 'echt');
  delete process.env.FOO_TEST_A;
  delete process.env.FOO_TEST_B;
  delete process.env.FOO_TEST_C;
  fs.rmSync(root, { recursive: true, force: true });
});

test('Fehlende .env.local ist kein Fehler', () => {
  assert.deepStrictEqual(loadEnvLocal({ root: path.join(os.tmpdir(), 'gibt-es-nicht-xyz') }), []);
});
