// Release-Pipeline: führt die vorhandenen Prüfungen in fester Reihenfolge aus.
// Jeder Schritt erbt die Konsole; der erste Fehler bricht die Pipeline ab.
// Der gesamte Lauf wird in pipeline/logs/ protokolliert (scripts/pipeline/protocol.cjs).
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { tryWriteProtocol } = require('./pipeline/protocol.cjs');
const root = path.resolve(__dirname, '..');

const steps = [
  ['Messkern ist aktuell (HTML-Werkzeug = App-Kern)', 'node scripts/build-tone-tool.cjs --check'],
  // Integrität (Katalog <-> Assets) muss passen; bekannte Vollständigkeitslücken
  // des gestoppten Inhaltsausbaus meldet der Vollcheck separat und exitiert 1.
  ['Inhalts-Integrität (Katalog, Assets)', 'node scripts/content/check.cjs --integrity-only'],
  ['Gegenmessung Thai-Töne (Katalog + Studio-Entwürfe)', 'node scripts/content/measure-tones.cjs'],
  ['Testreihe', 'npx jest --ci'],
];

const checks = [];
let failedLabel = null;
let failedStatus = null;
for (const [label, command] of steps) {
  console.log(`\n=== ${label}\n    $ ${command}`);
  const result = spawnSync(command, { shell: true, cwd: root, stdio: 'inherit' });
  const passed = result.status === 0;
  checks.push({ label, command, status: passed ? 'passed' : `failed (exit ${result.status ?? 'signal'})` });
  if (!passed) {
    failedLabel = label;
    failedStatus = result.status ?? 1;
    console.error(`\nPipeline abgebrochen bei: ${label}`);
    break;
  }
}
tryWriteProtocol({
  script: 'release-pipeline',
  action: 'release',
  items: checks.length,
  checks: { steps: checks, remainingSteps: failedLabel ? steps.length - checks.length : 0 },
  result: failedLabel ? 'failed' : 'ok',
  notes: failedLabel ? `abgebrochen bei: ${failedLabel}` : 'alle Schritte bestanden — bereit für Build/Release',
});
if (failedLabel) process.exit(failedStatus);
console.log('\nPipeline vollständig bestanden — bereit für Build/Release.');
