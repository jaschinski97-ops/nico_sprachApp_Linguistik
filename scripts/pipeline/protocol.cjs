// Lauf-Protokoll für die Content-Pipeline (docs/ROADMAP-v2-sprachplattform.md,
// Phase 2: „pipeline/-Struktur mit Lauf-Protokollen"). Jedes KI-Lauf und jeder
// Pipeline-Schritt schreibt am Ende:
//
//   pipeline/logs/YYYY-MM-DD-<script>-<action>.json  — ein File je Lauf
//   pipeline/logs/index.ndjson                       — eine kompakte Zeile je Lauf
//
// Das Protokoll ist ein Werkzeug, kein Überwachungssystem: Es beschreibt, was
// mit welchem Modell/Stimme erzeugt wurde, welche Checks liefen und wie das
// Ergebnis ausfiel. Schlüssel gehören nie hinein (Umgebung only, wie überall).

const fs = require('node:fs');
const path = require('node:path');

// Default: Repo-Wurzel. PIPELINE_PROTOCOL_ROOT überschreibt den Ort — nur für
// Tests und Werkzeuge gedacht, die nicht ins echte pipeline/logs/ schreiben.
const ROOT = process.env.PIPELINE_PROTOCOL_ROOT
  ? path.resolve(process.env.PIPELINE_PROTOCOL_ROOT)
  : path.resolve(__dirname, '../..');

const SAFE_SEGMENT = /[^a-zA-Z0-9_-]+/g;

function todayIso(date) {
  return (date ?? new Date()).toISOString().slice(0, 10);
}

/**
 * Schreibt einen Protokolleintrag. Synchron und append-freundlich: Die
 * NDJSON-Zeile wird angehängt, niemals bestehende Zeilen angetastet.
 *
 * writeProtocol({
 *   script: 'generate-audio',       // Pflicht: Skriptname
 *   action: 'tts-batch',            // Pflicht: was lief
 *   model, voice,                   // optional: Modell/Stimme des Laufs
 *   items,                          // optional: Anzahl erzeugter/geprüfter Einheiten
 *   costEstimateUsd,                // optional: Kostenschätzung in USD
 *   checks,                         // optional: Objekt mit Check-Ergebnissen
 *   result,                         // optional: 'ok' | 'partial' | 'failed' | 'error' | …
 *   notes,                          // optional: freier Text
 * }, { root })                      // root nur für Tests überschreiben
 *
 * Rückgabe: { file, index } — Pfade der geschriebenen Dateien.
 */
function writeProtocol(entry, { root = ROOT } = {}) {
  if (!entry || typeof entry.script !== 'string' || !entry.script.trim()) throw Error('Protokoll ohne script.');
  if (typeof entry.action !== 'string' || !entry.action.trim()) throw Error('Protokoll ohne action.');
  const loggedAt = new Date().toISOString();
  const record = { protocolVersion: 1, loggedAt };
  for (const field of ['script', 'action', 'model', 'voice', 'items', 'costEstimateUsd', 'checks', 'result', 'notes']) {
    if (entry[field] !== undefined) record[field] = entry[field];
  }
  const logsDir = path.join(root, 'pipeline', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const stem = `${todayIso(new Date(loggedAt))}-${String(entry.script).replace(SAFE_SEGMENT, '-')}-${String(entry.action).replace(SAFE_SEGMENT, '-')}`;
  // Kollisionen (mehrere Läufe am selben Tag mit gleichem Namen) bekommen eine
  // laufende Nummer — bestehende Dateien werden nie überschrieben.
  const payload = JSON.stringify(record, null, 2) + '\n';
  // 'wx' statt existsSync: Bei gleichzeitigen Läufen entscheidet das
  // Dateisystem, nicht die Uhrzeit — EEXIST erhöht die Nummer (TOCTOU-Fix,
  // Review P2-2 2026-09-09). Bestehende Dateien werden nie überschrieben.
  let file = path.join(logsDir, `${stem}.json`);
  for (let attempt = 2; ; attempt++) {
    try {
      fs.writeFileSync(file, payload, { flag: 'wx' });
      break;
    } catch (error) {
      if (error && error.code === 'EEXIST') file = path.join(logsDir, `${stem}-${attempt}.json`);
      else throw error;
    }
  }
  const line = { loggedAt, script: entry.script, action: entry.action };
  for (const field of ['model', 'voice', 'items', 'costEstimateUsd', 'result']) {
    if (entry[field] !== undefined) line[field] = entry[field];
  }
  line.file = path.basename(file);
  const index = path.join(logsDir, 'index.ndjson');
  fs.appendFileSync(index, JSON.stringify(line) + '\n');
  return { file, index };
}

/** Protokollieren darf den eigentlichen Lauf nie scheitern lassen. */
function tryWriteProtocol(entry, options) {
  try { return writeProtocol(entry, options); }
  catch (error) { console.error(`Protokoll konnte nicht geschrieben werden: ${error.message}`); return null; }
}

module.exports = { writeProtocol, tryWriteProtocol };
