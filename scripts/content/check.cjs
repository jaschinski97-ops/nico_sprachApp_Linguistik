const fs = require('node:fs');
const path = require('node:path');
const { digestOf, assertDocument, BUDGET, keyOf } = require('./pipeline.cjs');
const domain = require('./domain.cjs');
const { planDeliveryAudio } = domain.load('src/lib/content/audio-plan');
const { BUILTIN_EXAM_MODULES } = domain.load('src/data/exam-modules');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const { planSituations, FULL_RUN } = domain.load('src/lib/conversation/plan');
const { checkThaiTone } = domain.load('src/lib/content/tone-gate');
const { isDeliverableEntry } = domain.load('src/lib/content/audio-policy');
const { decodeAudio, decodeImage } = require('./media.cjs');
const { createHash } = require('node:crypto');

function checkContent(root, { integrityOnly = false } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/content/catalog.json'), 'utf8'));
  const errors = [];
  const seen = new Set();
  const assetMap = fs.readFileSync(path.join(root, 'src/content/assets.ts'), 'utf8');
  let audioSourceBytes = 0;
  let audioCompressedBytes = 0;
  let contentBytes = 0;
  let uncheckedThaiDelivered = 0;
  if (catalog.version !== 2 || !Array.isArray(catalog.entries)) throw Error('Unbekannte Katalogversion.');
  for (const entry of catalog.entries) {
    try {
      assertDocument(entry.kind, entry.document);
      if (entry.id !== entry.document.id || seen.has(keyOf(entry))) throw Error('Doppelte oder abweichende ID.');
      seen.add(keyOf(entry));
      if (entry.review || !isDeliverableEntry(entry) || !entry.check.checkedAt || entry.check.scope !== 'schema-integrity-decode' ||
          entry.check.label !== (entry.check.status === 'unchecked' ? 'ungeprüft' : 'automatisch geprüft')) throw Error('Automatische Prüfung fehlt.');
      const media = entry.kind === 'audio' || entry.kind === 'images';
      if (media && !entry.asset) throw Error('Mediendatei fehlt.');
      if (entry.asset && !/^[a-f0-9]{64}\.(mp3|png|jpeg|webp)$/.test(entry.asset)) throw Error('Unsicherer Assetpfad.');
      if (entry.asset && !assetMap.includes(`${JSON.stringify(entry.asset)}: require('../../assets/content/${entry.asset}')`)) throw Error('Statischer Expo-Asset-Verweis fehlt.');
      const bytes = entry.asset ? fs.readFileSync(path.join(root, 'assets/content', entry.asset)) : Buffer.alloc(0);
      if (digestOf(entry.kind, entry.document, bytes) !== entry.digest) throw Error('Datei oder Metadaten geändert.');
      if (media && createHash('sha256').update(bytes).digest('hex') + '.' + entry.document.format !== entry.asset) throw Error('Asset-Hash stimmt nicht.');
      if (media && (bytes.length !== entry.byteSize || bytes.length !== entry.document.byteSize)) throw Error('Falsche Größenangabe.');
      if (entry.kind === 'audio') {
        if (entry.document.format !== 'mp3' || !entry.asset.endsWith('.mp3')) throw Error('Unkomprimiertes Audio.');
        audioSourceBytes += entry.sourceBytes;
        audioCompressedBytes += bytes.length;
        const tone = checkThaiTone(entry.document, decodeAudio(path.join(root, 'assets/content', entry.asset)), 24000);
        if (entry.check.tone?.status !== tone.status || tone.status === 'failed') throw Error('Thai-Tontor nicht bestanden oder Status verändert: ' + tone.reason);
        if (entry.document.language === 'th' && tone.status === 'unchecked') uncheckedThaiDelivered++;
      } else if (entry.kind === 'images') {
        decodeImage(path.join(root, 'assets/content', entry.asset));
      }
      contentBytes += bytes.length + Buffer.byteLength(JSON.stringify(entry));
    } catch (error) { errors.push(`${entry.kind}:${entry.id}: ${error.message}`); }
  }
  // Gegenrichtung (Konsistenz): Nichts darf in assets/content/ oder in der
  // require-Map liegen, das der Katalog nicht referenziert — verwaiste Assets
  // aus alten Generierungsläufen blähen nur das Bundle auf. Der Katalog ist
  // die Definitions-Hoheit; assets.ts wird aus ihm generiert. Diese Prüfung
  // läuft in beiden Modi: prune-orphans.cjs hält den Zustand sauber, der
  // Check verhindert Regression.
  const referencedAssets = new Set(catalog.entries.flatMap((entry) => (entry.asset ? [entry.asset] : [])));
  const assetDir = path.join(root, 'assets/content');
  const orphanFiles = (fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [])
    .filter((name) => /\.(mp3|png|jpeg|webp)$/.test(name) && !referencedAssets.has(name)).sort();
  if (orphanFiles.length) errors.push(`${orphanFiles.length} nicht referenzierte Mediendateien in assets/content (${orphanFiles.slice(0, 3).join(', ')}${orphanFiles.length > 3 ? ' …' : ''}); verwaiste Assets mit scripts/content/prune-orphans.cjs --apply entfernen.`);
  const assetKeys = [...assetMap.matchAll(/"([a-f0-9]{64}\.(?:mp3|png|jpeg|webp))": require\('/g)].map((match) => match[1]);
  const orphanKeys = assetKeys.filter((key) => !referencedAssets.has(key));
  if (orphanKeys.length) errors.push(`${orphanKeys.length} Schlüssel in src/content/assets.ts ohne Katalogreferenz (${orphanKeys.slice(0, 3).join(', ')}${orphanKeys.length > 3 ? ' …' : ''}); die require-Map wird aus dem Katalog generiert und darf keine eigenen Einträge haben.`);
  if (contentBytes > BUDGET) errors.push('Inhaltsbudget von 150 MiB überschritten. Keine automatische Kürzung zulässig.');
  const situations = catalog.entries.filter((entry) => entry.kind === 'situations').map((entry) => entry.document);
  const exams = [...BUILTIN_EXAM_MODULES, ...catalog.entries.filter((entry) => entry.kind === 'exam').map((entry) => entry.document)];
  const neededAudio = planDeliveryAudio(situations, exams);
  const missingAudio = neededAudio.filter((spec) => !seen.has(`audio:${spec.id}`));
  const missingImages = VOCABULARY.filter((entry) => entry.isConcrete && !seen.has(`images:${entry.id}`));
  const missingSituations = planSituations(FULL_RUN).filter((spec) => !seen.has(`situations:${spec.id}`));
  if (!integrityOnly) {
    if (missingAudio.length) errors.push(`${missingAudio.length}/${neededAudio.length} benötigte Hörclips fehlen (auch Deutsch und Prüfungen). System-TTS ist kein garantierter Offline-Ersatz.`);
    if (missingImages.length) errors.push(`${missingImages.length} konkrete Vokabeln ohne automatisch geprüftes Bild.`);
    if (missingSituations.length) errors.push(`${missingSituations.length} Situationen des vollständigen Thai-Plans fehlen. Keine Teilmenge als Vollmenge ausgeben.`);
    // The existing EN/ES situation prompt is intentionally Thai-only (AE-48).
    // Keep this visible as a completeness blocker instead of silently treating
    // an empty conversation tab as an offline-complete product.
    for (const language of ['en', 'es']) {
      if (!situations.some((situation) => situation.direction === `de_to_${language}`)) errors.push(`Gespräche für ${language} fehlen (AE-48; eigener geprüfter Sprachinhalt erforderlich).`);
    }
  }
  return { checkedAt: new Date().toISOString(), integrityOnly, entries: catalog.entries.length, contentBytes,
    audioSourceBytes, audioCompressedBytes, uncheckedThaiDelivered, missing: { audio: missingAudio.map((spec) => spec.id), images: missingImages.map((entry) => entry.id), situations: missingSituations.map((spec) => spec.id) }, errors };
}
if (require.main === module) {
  const result = checkContent(path.resolve(__dirname, '../..'), { integrityOnly: process.argv.includes('--integrity-only') });
  console.log(JSON.stringify({ ...result, missing: Object.fromEntries(Object.entries(result.missing).map(([kind, ids]) => [kind, ids.length])) }, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
module.exports = { checkContent };
