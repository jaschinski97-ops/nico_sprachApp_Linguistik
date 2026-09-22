const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { getAssetData } = require('@expo/metro/metro/Assets');
const { createAssetReader } = require('./metro-content-assets.cjs');

test('Inhalts-MP3s haben exakt Metros Metadaten für iOS und Android', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'thaispeaker-metro-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const read = createAssetReader(getAssetData, directory);
  for (const bytes of [Buffer.from('asset one'), Buffer.from([0, 127, 255, 8])]) {
    const filename = createHash('sha256').update(bytes).digest('hex') + '.mp3';
    const file = path.join(directory, filename);
    fs.writeFileSync(file, bytes);
    for (const platform of ['ios', 'android']) {
      for (const [localPath, publicPath] of [
        [path.join('assets', 'content', filename), '/assets'],
        [path.join('..', 'shared', filename), '/assets/'],
        [path.join('assets', 'content', filename), '/assets?unstable_path=.'],
      ]) {
        const args = [file, localPath, [], platform, publicPath];
        assert.deepEqual(await read(...args), await getAssetData(...args));
      }
    }
    fs.writeFileSync(file, 'corrupt');
    await assert.rejects(read(file, filename, [], 'ios', '/assets'), /Assetnamen/);
    fs.unlinkSync(file);
    await assert.rejects(read(file, filename, [], 'ios', '/assets'), { code: 'ENOENT' });
  }
});

test('Varianten, Bilder, Plugins, Web und fremde Ordner bleiben bei Metro', async () => {
  const directory = path.resolve('assets/content');
  const filename = 'a'.repeat(64) + '.mp3';
  const read = createAssetReader((...args) => args, directory);
  const cases = [
    [path.join(directory, 'voice@2x.mp3'), 'voice@2x.mp3', [], 'ios', '/assets'],
    [path.join(directory, 'image.png'), 'image.png', [], 'android', '/assets'],
    [path.join(directory, filename), filename, ['plugin'], 'ios', '/assets'],
    [path.join(directory, filename), filename, [], 'web', '/assets'],
    [path.join(directory, '..', filename), filename, [], 'ios', '/assets'],
  ];
  for (const args of cases) assert.deepEqual(await read(...args), args);
});
