const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// SDK 57 / Metro durchsucht für JEDES Asset seinen gesamten Ordner nach
// Plattform- und Größenvarianten. Bei 14.500 flachen Dateien wird das quadratisch.
// Unsere SHA-256-benannten MP3s sind einzelne, inhaltsadressierte Dateien ohne
// Varianten. Nur diesen Fall direkt auflösen; alle anderen Assets/Plugins
// bleiben bei Metro. Paritätstests vergleichen mit der installierten Metro-Version.
function createAssetReader(original, directory) {
  const root = path.resolve(directory);
  return async (assetPath, localPath, plugins, platform, publicPath) => {
    const filename = path.basename(assetPath);
    if (path.dirname(assetPath) !== root || !/^[a-f0-9]{64}\.mp3$/.test(filename) ||
        !Array.isArray(plugins) || plugins.length || !['ios', 'android'].includes(platform)) {
      return original(assetPath, localPath, plugins, platform, publicPath);
    }
    const bytes = await fs.promises.readFile(assetPath);
    const name = filename.slice(0, -4);
    if (createHash('sha256').update(bytes).digest('hex') !== name) {
      throw Error(`Inhalt stimmt nicht mit dem Assetnamen überein: ${assetPath}`);
    }
    const location = localPath.startsWith('..')
      ? publicPath.replace(/\/$/, '') + '/' + path.dirname(localPath)
      : path.join(publicPath, path.dirname(localPath));
    return {
      __packager_asset: true,
      fileSystemLocation: root,
      httpServerLocation: location.replaceAll('\\', '/'),
      width: undefined,
      height: undefined,
      scales: [1],
      files: [assetPath],
      hash: createHash('md5').update(bytes).digest('hex'),
      name,
      type: 'mp3',
    };
  };
}

function install(directory) {
  const assets = require('@expo/metro/metro/Assets');
  const marker = Symbol.for('thaispeaker.contentAssetReader');
  if (assets[marker]) return;
  assets.getAssetData = createAssetReader(assets.getAssetData, directory);
  assets[marker] = true;
}

module.exports = { createAssetReader, install };
