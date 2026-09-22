const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { verifyContentAssets } = require('./verify-assets.cjs');

test('Medienprüfung prüft public-Webdateien und beide nativen Manifestdateien', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thaispeaker-assets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const exported = path.join(root, 'export');
  const bytes = Buffer.from('fixture-media');
  const hash = crypto.createHash('md5').update(bytes).digest('hex');
  const stem = crypto.createHash('sha256').update(bytes).digest('hex');
  const asset = `${stem}.mp3`;
  function write(relative, data) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }
  write('src/content/catalog.json', JSON.stringify({ entries: [{ id: 'fixture', kind: 'audio', asset }] }));
  write(`assets/content/${asset}`, bytes);
  write(`export/content/${asset}`, bytes);
  write(`export/assets/${hash}`, bytes);
  write('export/_expo/static/js/web/entry-fixture.js', JSON.stringify(asset));
  const assets = [{ path: `assets/${hash}`, ext: 'mp3' }];
  write('export/metadata.json', JSON.stringify({ fileMetadata: { ios: { assets }, android: { assets } } }));
  assert.equal(verifyContentAssets(root, exported).rows.length, 3);
  write(`export/content/${asset}`, 'broken');
  assert.throws(() => verifyContentAssets(root, exported), /web\/fixture/);
  write(`export/content/${asset}`, bytes);
  write(`export/assets/${hash}`, 'broken');
  assert.throws(() => verifyContentAssets(root, exported), /ios\/fixture/);
});
