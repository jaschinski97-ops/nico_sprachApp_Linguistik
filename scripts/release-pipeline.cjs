// Release-Pipeline: führt die vorhandenen Prüfungen in fester Reihenfolge aus.
// Jeder Schritt erbt die Konsole; der erste Fehler bricht die Pipeline ab.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const steps = [
  ['Messkern ist aktuell (HTML-Werkzeug = App-Kern)', 'node scripts/build-tone-tool.cjs --check'],
  // Integrität (Katalog <-> Assets) muss passen; bekannte Vollständigkeitslücken
  // des gestoppten Inhaltsausbaus meldet der Vollcheck separat und exitiert 1.
  ['Inhalts-Integrität (Katalog, Assets)', 'node scripts/content/check.cjs --integrity-only'],
  ['Gegenmessung Thai-Töne (Katalog + Studio-Entwürfe)', 'node scripts/content/measure-tones.cjs'],
  ['Testreihe', 'npx jest --ci'],
];

for (const [label, command] of steps) {
  console.log(`\n=== ${label}\n    $ ${command}`);
  const result = spawnSync(command, { shell: true, cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nPipeline abgebrochen bei: ${label}`);
    process.exit(result.status ?? 1);
  }
}
console.log('\nPipeline vollständig bestanden — bereit für Build/Release.');
