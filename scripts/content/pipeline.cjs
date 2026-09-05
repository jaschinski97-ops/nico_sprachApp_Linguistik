const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const ffmpeg = require('ffmpeg-static');
const domain = require('./domain.cjs');
const { isValidSituation } = domain.load('src/lib/conversation/types');
const { isValidExamModule } = domain.load('src/lib/exam/types');
const { isValidAudioClip, clipIdFor } = domain.load('src/lib/clips/types');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const { checkThaiTone, TONE_GATE_LIMITS } = domain.load('src/lib/content/tone-gate');
const { decodeAudio, decodeImage } = require('./media.cjs');

const KINDS = ['situations', 'images', 'audio', 'exam'];
const BUDGET = 150 * 1024 * 1024;
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
const digestOf = (kind, document, bytes = Buffer.alloc(0)) => sha(JSON.stringify(canonical({ kind, document, assetHash: sha(bytes) })));
const keyOf = (entry) => `${entry.kind}:${entry.id}`;
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(temp, file);
}
function assertDocument(kind, doc) {
  if (!KINDS.includes(kind) || !doc || !/^[a-zA-Z0-9_-]{1,180}$/.test(doc.id)) throw Error('Ungültige Inhaltsart oder ID.');
  const valid = kind === 'situations' ? isValidSituation(doc) && ['A1','A2'].includes(doc.level) && ['greeting','market','restaurant','travel'].includes(doc.topic) && Number.isFinite(doc.generatedAt) && typeof doc.modelUsed === 'string' :
    kind === 'exam' ? isValidExamModule(doc) && doc.source === 'generated' :
    kind === 'audio' ? isValidAudioClip(doc) && doc.id === clipIdFor(doc.language, doc.text) && ['vocab','example','turn'].includes(doc.kind) && ['gemini','chatgpt'].includes(doc.provider) && typeof doc.voice === 'string' && typeof doc.model === 'string' && Number.isFinite(doc.generatedAt) :
    doc.id === doc.vocabId && VOCABULARY.some((word) => word.id === doc.id && word.isConcrete) && ['png','jpeg','webp'].includes(doc.format) && typeof doc.prompt === 'string' && typeof doc.model === 'string' && Number.isFinite(doc.generatedAt);
  if (!valid) throw Error(`Inhalt verletzt den ${kind}-Vertrag: ${doc.id}`);
  // Export content documents only. Preferences, keys, learner records and
  // unrecognised top-level fields cannot cross this boundary.
  const fields = {
    situations: 'id level topic direction title setting scriptTurns corrections generatedAt modelUsed',
    images: 'id vocabId format byteSize blobKey prompt model generatedAt',
    audio: 'id language text kind sourceId format byteSize durationMs blobKey provider model voice generatedAt synthetic',
    exam: 'id certificate level skill direction title instruction stimulus minutes source generatedAt modelUsed taskType items production',
  }[kind].split(' ');
  if (Object.keys(doc).some((key) => !fields.includes(key))) throw Error('Unbekannte Metadatenfelder; Export verweigert.');
}
async function compressAudio(input, output) {
  await exec(ffmpeg, ['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file,pipe',
    '-i', input, '-map','0:a:0','-vn','-map_metadata','-1','-ac','1','-ar','24000',
    '-c:a','libmp3lame','-b:a','64k', output], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
}
class ContentPipeline {
  constructor(root) {
    this.root = root;
    this.work = path.join(root, '.content-studio');
    this.stageFile = path.join(this.work, 'stage.json');
    this.catalogFile = path.join(root, 'src/content/catalog.json');
    this.reportFile = path.join(root, 'content/automatic-checks.json');
  }
  async catalog() { return readJson(this.catalogFile, { version: 2, entries: [] }); }
  async state() {
    return { stage: await readJson(this.stageFile, { version: 2, entries: [] }),
      shipped: await this.catalog(), report: await readJson(this.reportFile, { entries: [] }) };
  }
  async stage({ kind, document, base64 }) {
    assertDocument(kind, document);
    const state = await this.state();
    let bytes = Buffer.alloc(0);
    let sourceBytes;
    const doc = { ...document };
    const media = kind === 'audio' || kind === 'images';
    await fs.mkdir(this.work, { recursive: true });
    if (media) {
      if (typeof base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64) || !base64) throw Error('Mediendatei fehlt oder Base64 ist beschädigt.');
      bytes = Buffer.from(base64, 'base64');
      sourceBytes = bytes.length;
      if (sourceBytes !== doc.byteSize) throw Error('Bytezahl stimmt nicht mit den Metadaten überein.');
      if (kind === 'audio') {
        const input = path.join(this.work, 'input.' + doc.format);
        const output = path.join(this.work, 'compressed.mp3');
        try {
          await fs.writeFile(input, bytes);
          await compressAudio(input, output);
          bytes = await fs.readFile(output);
        } finally {
          await fs.rm(input, { force: true });
          await fs.rm(output, { force: true });
        }
        doc.format = 'mp3';
      } else {
        const good = doc.format === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex')) :
          doc.format === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 :
          bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!good) throw Error('Dateityp stimmt nicht mit dem Bildformat überein.');
      }
      doc.byteSize = bytes.length;
      doc.blobKey = sha(bytes) + '.' + doc.format;
    } else if (base64 !== undefined) throw Error('Textinhalt darf keine Binärdaten enthalten.');
    const digest = digestOf(kind, doc, bytes);
    const entry = { kind, id: doc.id, document: doc, digest,
      ...(media ? { asset: doc.blobKey, byteSize: bytes.length, sourceBytes } : {}) };
    if (media) await fs.writeFile(path.join(this.work, entry.asset), bytes);
    entry.check = this.checkEntry(entry, media ? path.join(this.work, entry.asset) : undefined);
    state.stage.version = 2;
    state.stage.entries = [...state.stage.entries.filter((item) => keyOf(item) !== keyOf(entry)), entry];
    await atomicJson(this.stageFile, state.stage);
    return entry;
  }
  checkEntry(entry, file) {
    const check = { status: 'passed', label: 'automatisch geprüft', checkedAt: new Date().toISOString(), scope: 'schema-integrity-decode' };
    if (entry.kind === 'audio') {
      check.tone = checkThaiTone(entry.document, decodeAudio(file), 24000);
      if (['failed', 'unchecked'].includes(check.tone.status)) check.status = check.tone.status;
    } else if (entry.kind === 'images') decodeImage(file);
    if (check.status === 'unchecked') check.label = 'ungeprüft';
    if (check.status === 'failed') check.label = 'aussortiert';
    return check;
  }
  async writeCatalog(catalog) {
    const assets = [...new Set(catalog.entries.flatMap((entry) => entry.asset ? [entry.asset] : []))].sort();
    const source = '// Generated by content:studio. Static requires are collected by Expo/Metro.\n' +
      'export const CONTENT_ASSETS: Record<string, number> = {\n' +
      assets.map((asset) => `  ${JSON.stringify(asset)}: require('../../assets/content/${asset}'),`).join('\n') + '\n};\n';
    await fs.mkdir(path.join(this.root, 'src/content'), { recursive: true });
    await fs.writeFile(path.join(this.root, 'src/content/assets.ts'), source);
    // Catalog is the last write: new entries only become visible after assets exist.
    await atomicJson(this.catalogFile, catalog);
  }
  async publish() {
    const state = await this.state();
    const merged = new Map(state.shipped.entries.map((entry) => [keyOf(entry), entry]));
    const assetDir = path.join(this.root, 'assets/content');
    for (const entry of state.stage.entries) merged.set(keyOf(entry), entry);
    const entries = [...merged.values()].sort((a,b) => keyOf(a).localeCompare(keyOf(b)));
    const budgetBytes = entries.reduce((sum, entry) => sum + (entry.byteSize ?? 0) + Buffer.byteLength(JSON.stringify(entry)), 0);
    if (budgetBytes > BUDGET) throw Error('Inhalt überschreitet das Budget von 150 MiB. Kein Teil wurde übernommen; Umfang ausdrücklich neu entscheiden.');
    // Validate the entire set before changing any versioned files.
    const prepared = [];
    for (const entry of entries) {
      assertDocument(entry.kind, entry.document);
      if (entry.id !== entry.document.id) throw Error('Abweichende ID.');
      if (entry.asset && !/^[a-f0-9]{64}\.(mp3|png|jpeg|webp)$/.test(entry.asset)) throw Error('Unsicherer Assetpfad.');
      if (['audio', 'images'].includes(entry.kind) && !entry.asset) throw Error('Mediendatei fehlt.');
      let bytes = Buffer.alloc(0);
      if (entry.asset) {
        try { bytes = await fs.readFile(path.join(this.work, entry.asset)); }
        catch (error) { if (error.code !== 'ENOENT') throw error; bytes = await fs.readFile(path.join(assetDir, entry.asset)); }
      }
      if (digestOf(entry.kind, entry.document, bytes) !== entry.digest) throw Error('Prüfsumme stimmt nicht: ' + entry.id);
      if (entry.asset && (sha(bytes) + '.' + entry.document.format !== entry.asset || bytes.length !== entry.byteSize || bytes.length !== entry.document.byteSize)) throw Error('Asset-Hash oder Bytezahl stimmt nicht: ' + entry.id);
      if (entry.kind === 'audio' && entry.document.format !== 'mp3') throw Error('Unkomprimierter Clip im Export.');
      let file;
      if (entry.asset) {
        file = path.join(this.work, entry.asset);
        try { await fs.access(file); } catch { file = path.join(assetDir, entry.asset); }
      }
      delete entry.review;
      entry.check = this.checkEntry(entry, file);
      prepared.push({ entry, bytes });
    }
    await fs.mkdir(assetDir, { recursive: true });
    const accepted = prepared.filter(({ entry }) => entry.check.status === 'passed');
    for (const { entry, bytes } of accepted) if (entry.asset) await fs.writeFile(path.join(assetDir, entry.asset), bytes);
    const delivered = accepted.map(({ entry }) => {
      const copy = structuredClone(entry);
      if (copy.check.tone) delete copy.check.tone.track;
      return copy;
    });
    await atomicJson(this.reportFile, { checkedAt: new Date().toISOString(), limitations: TONE_GATE_LIMITS,
      entries: prepared.map(({ entry }) => ({ kind: entry.kind, id: entry.id, digest: entry.digest, text: entry.document.text, asset: entry.asset, ...entry.check })) });
    const report = {
      measuredAt: new Date().toISOString(), encoder: 'libmp3lame, 64 kbit/s, mono, 24000 Hz',
      entries: delivered.length, unchecked: prepared.filter(({ entry }) => entry.check.status === 'unchecked').length,
      failed: prepared.filter(({ entry }) => entry.check.status === 'failed').length, contentBudgetBytes: BUDGET,
      budgetBytes: delivered.reduce((sum, entry) => sum + (entry.byteSize ?? 0) + Buffer.byteLength(JSON.stringify(entry)), 0),
      audio: delivered.filter((entry) => entry.kind === 'audio').map((entry) => ({ id: entry.id, sourceBytes: entry.sourceBytes, compressedBytes: entry.byteSize })),
    };
    await atomicJson(path.join(this.root, 'content/size-report.json'), report);
    await this.writeCatalog({ version: 2, entries: delivered });
    await atomicJson(this.stageFile, { version: 2, entries: prepared.map(({ entry }) => entry) });
    return report;
  }
}
module.exports = { ContentPipeline, compressAudio, digestOf, assertDocument, BUDGET, keyOf };
