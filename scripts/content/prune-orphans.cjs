const fs = require('node:fs');
const path = require('node:path');

// Entfernt verwaiste Mediendateien aus assets/content: Dateien, die weder vom
// Katalog (src/content/catalog.json, Feld `asset`) noch von der statischen
// require-Map (src/content/assets.ts) referenziert werden — typischerweise
// Reste alter Generierungsläufe, deren Katalogeintrag ersetzt wurde. Die
// Definition der Referenzen folgt exakt check.cjs: Der Katalog liefert die
// Asset-Hashes, assets.ts wird von pipeline.cjs (writeCatalog) aus denselben
// Einträgen erzeugt. Für die Löschentscheidung zählt die UNION beider Quellen
// — eine Datei, die in irgendeiner Quelle auftaucht, wird nie gelöscht.

const SAFE_ASSET_NAME = /^[a-f0-9]{64}\.(mp3|png|jpeg|webp)$/;
const ASSET_KEY_PATTERN = /"([a-f0-9]{64}\.(?:mp3|png|jpeg|webp))": require\('/g;
const MEDIA_EXTENSION = /\.(mp3|png|jpeg|webp)$/i;

function referencedAssets(root) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/content/catalog.json'), 'utf8'));
  const assetMap = fs.readFileSync(path.join(root, 'src/content/assets.ts'), 'utf8');
  const referenced = new Set(catalog.entries.flatMap((entry) => (entry.asset ? [entry.asset] : [])));
  for (const match of assetMap.matchAll(ASSET_KEY_PATTERN)) referenced.add(match[1]);
  return referenced;
}

function collectOrphans(root) {
  const referenced = referencedAssets(root);
  const dir = path.join(root, 'assets/content');
  const orphans = [];
  const unknown = [];
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (!stat.isFile()) { unknown.push({ name, bytes: 0, reason: 'keine reguläre Datei' }); continue; }
    if (SAFE_ASSET_NAME.test(name)) {
      if (!referenced.has(name)) orphans.push({ name, bytes: stat.size });
    } else {
      const reason = MEDIA_EXTENSION.test(name) ? 'Medien-Endung ohne Hash-Namen' : 'unbekannte Datei';
      unknown.push({ name, bytes: stat.size, reason });
    }
  }
  orphans.sort((a, b) => a.name.localeCompare(b.name));
  unknown.sort((a, b) => a.name.localeCompare(b.name));
  return { referencedCount: referenced.size, orphans, unknown };
}

function pruneOrphans(root, { apply = false } = {}) {
  const state = collectOrphans(root);
  let deleted = 0;
  let freedBytes = 0;
  if (apply) {
    for (const orphan of state.orphans) {
      fs.unlinkSync(path.join(root, 'assets/content', orphan.name));
      deleted++;
      freedBytes += orphan.bytes;
    }
  }
  return { ...state, deleted, freedBytes };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

if (require.main === module) {
  const apply = process.argv.includes('--apply');
  const result = pruneOrphans(path.resolve(__dirname, '../..'), { apply });
  for (const orphan of result.orphans) console.log(`${apply ? 'gelöscht  ' : 'verwaist   '}${orphan.name}  ${formatBytes(orphan.bytes)}`);
  for (const file of result.unknown) console.log(`ignoriert  ${file.name}  ${formatBytes(file.bytes)}  (${file.reason}; wird nie automatisch gelöscht)`);
  const orphanBytes = result.orphans.reduce((sum, orphan) => sum + orphan.bytes, 0);
  console.log(`\n${result.referencedCount} referenzierte Assets (Katalog ∪ require-Map).`);
  console.log(apply
    ? `${result.deleted} Datei(en) gelöscht, ${formatBytes(result.freedBytes)} freigegeben.`
    : `${result.orphans.length} verwaiste Datei(en), ${formatBytes(orphanBytes)} — Dry-Run, mit --apply löschen.`);
  if (result.unknown.length) console.log(`${result.unknown.length} unbekannte Datei(en) bleiben unangetastet.`);
}

module.exports = { referencedAssets, collectOrphans, pruneOrphans };
