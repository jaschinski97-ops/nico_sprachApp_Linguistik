const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function filesUnder(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

function verifyContentAssets(root, exported) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/content/catalog.json'), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(exported, 'metadata.json'), 'utf8'));
  const media = catalog.entries.filter(entry => entry.asset);
  if (!media.length) throw Error('Kein ausgeliefertes Medium vorhanden.');
  const webFiles = filesUnder(path.join(exported, 'assets/assets/content'));
  const webBundleDir = path.join(exported, '_expo/static/js/web');
  const webBundleFile = fs.readdirSync(webBundleDir).find(name => /^entry-.*\.js$/.test(name));
  if (!webBundleFile) throw Error('Web-Produktionsbundle fehlt.');
  const webBundle = fs.readFileSync(path.join(webBundleDir, webBundleFile), 'utf8');
  const rows = [];
  for (const entry of media) {
    const original = fs.readFileSync(path.join(root, 'assets/content', entry.asset));
    const hash = crypto.createHash('md5').update(original).digest('hex');
    const sha256 = crypto.createHash('sha256').update(original).digest('hex');
    const ext = path.extname(entry.asset);
    const stem = path.basename(entry.asset, ext);
    if (!webBundle.includes(stem)) throw Error('Web-Verweis fehlt: ' + entry.id);
    for (const platform of ['ios', 'android', 'web']) {
      let file;
      if (platform === 'web') {
        file = webFiles.find(candidate => path.basename(candidate) === `${stem}.${hash}${ext}`);
      } else {
        const asset = metadata.fileMetadata[platform]?.assets.find(item =>
          path.posix.basename(item.path.replaceAll('\\', '/')) === hash && item.ext === ext.slice(1));
        if (asset) file = path.join(exported, asset.path);
      }
      if (!file || !fs.readFileSync(file).equals(original)) throw Error(`Asset fehlt oder ist verändert: ${platform}/${entry.id}`);
      rows.push({ platform, kind: entry.kind, id: entry.id, bytes: original.length, sha256, identical: true });
    }
  }
  return { verifiedAt: new Date().toISOString(),
    scope: 'Actual checked-in automatically checked media, byte-identical in iOS/Android Expo asset manifests and the Web export. Hermes exports are not signed AAB/IPA files or physical device playback.',
    media: media.length, rows };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const report = verifyContentAssets(root, path.resolve(process.argv[2] ?? 'build-verification/production'));
  fs.writeFileSync(path.join(root, 'content/asset-bundling-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ media: report.media, byteComparisons: report.rows.length, platforms: ['ios', 'android', 'web'], allIdentical: true }, null, 2));
}
module.exports = { verifyContentAssets };
