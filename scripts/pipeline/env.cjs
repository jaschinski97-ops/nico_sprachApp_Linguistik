// Lädt .env.local aus dem Projektstamm in process.env — ohne Dependency.
// Existierende Umgebungsvariablen gewinnen immer (nur leere/fehlende werden
// gefüllt). .env.local ist gitignored und trägt die lokalen API-Schlüssel
// (Nutzerentscheidung 09.09.2026: Debug-Studio + Helper ohne jedes Neueintippen).
const fs = require('node:fs');
const path = require('node:path');

function loadEnvLocal({ root = path.join(__dirname, '..', '..') } = {}) {
  const file = path.join(root, '.env.local');
  const loaded = [];
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    // Kein .env.local — völlig ok, dann läuft alles über echte Umgebungsvariablen.
    return loaded;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!name) continue;
    const current = process.env[name];
    if (current === undefined || current === '') {
      process.env[name] = value;
      loaded.push(name);
    }
  }
  return loaded;
}

module.exports = { loadEnvLocal };
