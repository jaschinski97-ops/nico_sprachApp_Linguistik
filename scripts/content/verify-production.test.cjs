const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { verify } = require('./verify-production.cjs');

test('Produktionsgate prüft Ordner-Index und alte Route gleich streng', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thaispeaker-production-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  function write(relative, data) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }
  for (const platform of ['ios', 'android', 'web']) {
    write(`${platform}/entry-test.js.map`, JSON.stringify({ sources: ['/src/app/index.tsx'] }));
  }
  write('settings/index.html', '<main>Einstellungen</main>');
  assert.equal(verify(root).checked.length, 3);
  write('settings/index.html', '<input type="password">');
  assert.throws(() => verify(root), /Eingabefeld/);
  fs.unlinkSync(path.join(root, 'settings/index.html'));
  write('settings.html', '<main>Einstellungen</main>');
  assert.equal(verify(root).productionSettingsInputs, 0);
  write('ios/entry-test.js.map', JSON.stringify({ sources: ['/src/dev/content-studio.tsx'] }));
  assert.throws(() => verify(root), /Entwicklercode/);
});
