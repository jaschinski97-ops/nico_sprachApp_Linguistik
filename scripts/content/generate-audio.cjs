// Admin-Werkzeug: fehlende Thai-Audios direkt vom Anbieter erzeugen — Node statt
// Browser, denn api.openai.com antwortet ohne CORS-Header (AE-27), das Web-Studio
// kann ChatGPT-Audio deshalb nicht erzeugen. Der Weg hier nutzt exakt dieselbe
// Ablage wie der Studio-Lauf: /stage validiert, komprimiert (mp3 64k mono 24 kHz)
// und misst den Thai-Ton; /publish uebernimmt nur Bestandenes (oder Ungeprueftes)
// in Katalog, assets/content und Berichte.
//
// Aufruf (Schluessel nur aus der Umgebung, nie in eine Datei):
//   OPENAI_API_KEY=sk-... node scripts/content/generate-audio.cjs [--scope core|full]
//
// scope core: Thai-Vokabeln + Beispielsaetze, die im Katalog fehlen (Standard).
// scope full: zusaetzlich die Zuege aller gespeicherten Sprachsituationen.
// Lauf ist fortsetzbar: was schon im Katalog steht, wird uebersprungen.

const path = require('node:path');
const domain = require('./domain.cjs');
const { decodeAudio } = require('./media.cjs');
const { checkThaiTone } = domain.load('src/lib/content/tone-gate');
const { planClips } = domain.load('src/lib/clips/plan');
const { VOCABULARY } = domain.load('src/data/vocabulary');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const scope = args.includes('--full') || args[args.indexOf('--scope') + 1] === 'full' ? 'full' : 'core';
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 0;
const publish = !args.includes('--no-publish');
const MODEL = 'gpt-4o-mini-tts-2025-12-15';
const VOICE = process.env.TTS_VOICE || 'coral';
const HELPER = 'http://127.0.0.1:8082';
const ORIGIN = 'http://localhost:8081';
const DELAY_MS = 500;
const inputFile = path.join(root, '.content-studio', 'generate-input.wav');
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('OPENAI_API_KEY fehlt in der Umgebung.'); process.exit(1); }

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/content/catalog.json'), 'utf8'));
const delivered = new Set(catalog.entries.filter((e) => e.kind === 'audio').map((e) => e.document.id));

// Situationszuege kommen aus dem Shipped-Katalog (kind 'situations' als Dokumente).
const situationDocs = scope === 'full'
  ? catalog.entries.filter((e) => e.kind === 'situations').map((e) => e.document)
  : [];

const specs = planClips({ language: 'th', includeWords: true, includeExamples: true, situations: situationDocs })
  .filter((spec) => !delivered.has(spec.id))
  .slice(0, limit || undefined);

if (specs.length === 0) { console.log('Nichts zu tun: alle Thai-Clips dieses Umfangs liegen im Katalog.'); process.exit(0); }
const vocabCount = specs.filter((s) => s.kind === 'vocab').length;
const exampleCount = specs.filter((s) => s.kind === 'example').length;
const turnCount = specs.filter((s) => s.kind === 'turn').length;

function wavDurationMs(bytes) {
  if (bytes.length < 44) return null;
  const byteRate = bytes.readUInt32LE(28);
  const dataLength = bytes.readUInt32LE(40);
  if (!byteRate) return null;
  return Math.round((dataLength / byteRate) * 1000);
}

/**
 * OpenAI liefert WAV mit Streaming-Header: die RIFF- und data-Groessen stehen
 * auf 0xFFFFFFFF. ffmpeg nennt das „corrupt input packet" und -xerror macht
 * es fatal; die App-weg-Messkette (decodeAudio) scheitert dadurch. Hier die
 * echten Groessen eintragen — der 44-Byte-Kopf ist der einzige, den der
 * Anbieter schreibt; zur Sicherheit wird die data-Chunk-Position gesucht.
 */
function normalizeWavHeader(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF') return bytes;
  let offset = 12;
  let dataOffset = 44;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'data') { dataOffset = offset + 8; break; }
    offset += 8 + size + (size % 2);
  }
  if (bytes.toString('ascii', dataOffset - 8, dataOffset - 4) !== 'data') return bytes;
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.writeUInt32LE(bytes.length - dataOffset, dataOffset - 4);
  return bytes;
}

async function synthesize(text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'wav' }),
    signal: AbortSignal.timeout(60000),
  });
  if (response.status === 429 || response.status >= 500) {
    const error = new Error(`Anbieter antwortet ${response.status}`);
    error.retryable = true;
    throw error;
  }
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Antwort ist kein WAV.');
  return normalizeWavHeader(bytes);
}

async function post(pathname, body) {
  const response = await fetch(HELPER + pathname, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? `Helper ${response.status}`);
  return value;
}

async function main() {
  console.log(`Fehlend: ${specs.length} Thai-Clips (Vokabeln ${vocabCount}, Beispiele ${exampleCount}, Zuege ${turnCount}) — Modell ${MODEL}, Stimme ${VOICE}.`);

  const failed = [];
  let staged = 0;
  for (const spec of specs) {
    let bytes;
    let attempt = 0;
    for (;;) {
      try { bytes = await synthesize(spec.text); break; }
      catch (error) {
        attempt += 1;
        if (!error.retryable || attempt >= 3) {
          console.log(`  FEHLER ${spec.text}: ${error.message}`);
          failed.push({ text: spec.text, reason: error.message });
          bytes = null;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      }
    }
    if (!bytes) continue;

    // Dieselbe Pruefung wie im App-Lauf, nur Node-seitig: erst messen, dann
    // ablegen — ein klarer Widerspruch wird gar nicht erst gestagt.
    // decodeAudio nimmt einen Pfad (ffmpeg), nicht Bytes.
    fs.writeFileSync(inputFile, bytes);
    let check;
    try {
      check = checkThaiTone(spec, decodeAudio(inputFile), 24000);
    } catch (error) {
      console.log(`  FEHLER ${spec.text}: Dekodierung scheiterte (${error.message.split('\n')[0]})`);
      failed.push({ text: spec.text, reason: 'Dekodierung: ' + error.message.split('\n')[0] });
      continue;
    }
    if (check.status === 'failed') {
      console.log(`  ABGELEHNT ${spec.text} (${check.targetTone}): ${check.reason}`);
      failed.push({ text: spec.text, reason: 'Ton-Check: ' + check.reason });
      continue;
    }

    await post('/stage', {
      kind: 'audio',
      document: {
        id: spec.id, language: spec.language, text: spec.text, kind: spec.kind,
        sourceId: spec.sourceId, format: 'wav', byteSize: bytes.length,
        durationMs: wavDurationMs(bytes), blobKey: `${spec.id}.wav`,
        provider: 'chatgpt', model: MODEL, voice: VOICE,
        generatedAt: Date.now(), synthetic: true,
      },
      base64: bytes.toString('base64'),
    });
    staged += 1;
    console.log(`  gestagt [${staged}/${specs.length}] ${spec.text} (${check.status})`);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  console.log(`\nStaging fertig: ${staged} gestagt, ${failed.length} ausgeschieden.`);
  if (staged > 0 && publish) {
    const report = await post('/publish', {});
    console.log(`Publish: ${report.entries} Eintraege ausgeliefert, ${report.unchecked} ungeprueft, ${report.failed} aussortiert, Budget ${(report.budgetBytes / 1024 / 1024).toFixed(1)} / 150 MiB.`);
  }
  if (failed.length) {
    console.log('\nAusgeschieden (neu anlaufen lassen oder Stimme wechseln):');
    for (const item of failed) console.log(`  ${item.text}: ${item.reason}`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => {
  fs.rmSync(inputFile, { force: true });
});
