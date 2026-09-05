const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { compressAudio } = require('./content-pipeline.cjs');
async function measure(input, output, sourceDescription) {
  await fs.mkdir(output, { recursive: true });
  const files = [];
  for (const name of (await fs.readdir(input)).sort()) {
    if (!/\.(wav|mp3)$/i.test(name)) continue;
    const source = path.join(input, name);
    const target = path.join(output, name.replace(/\.[^.]+$/, '.mp3'));
    if (path.resolve(source) === path.resolve(target)) throw Error('Messausgabe muss getrennt von der Quelle liegen.');
    await compressAudio(source, target);
    const raw = await fs.readFile(source);
    const compressed = await fs.readFile(target);
    files.push({ name, sourceBytes: raw.length, compressedBytes: compressed.length,
      sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'),
      compressedSha256: crypto.createHash('sha256').update(compressed).digest('hex') });
  }
  if (!files.length) throw Error('Keine Audiodateien vorhanden.');
  return { measuredAt: new Date().toISOString(), sourceDescription, encoder: 'libmp3lame 64 kbit/s, mono, 24000 Hz',
    sourceBytes: files.reduce((sum, item) => sum + item.sourceBytes, 0),
    compressedBytes: files.reduce((sum, item) => sum + item.compressedBytes, 0), files };
}
if (require.main === module) {
  const [input, output, description] = process.argv.slice(2);
  if (!input || !output || !description) throw Error('Aufruf: node scripts/measure-audio.cjs <Quellordner> <Ausgabeordner> <Quellenbeschreibung>');
  measure(input, output, description).then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { measure };
