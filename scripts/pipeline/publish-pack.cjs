// Paket-Upload für GitHub Releases (ROADMAP v2, Phase 2): Sprachpakete landen
// als Release-Assets, die App lädt sie beim ersten Start einer Sprache. Das
// Skript ist bewusst dumm: Es prüft gh, rechnet den sha256 aus und ruft
// `gh release create`. Ohne gh (oder ohne Anmeldung) bricht es sauber ab und
// druckt die exakten manuellen Schritte — nichts wird halb hochgeladen.
//
// Aufruf:
//   node scripts/pipeline/publish-pack.cjs --lang th --version 1 --file dist/packs/pack-th-v1.zip
//
// KEIN Key, KEIN Token: gh benutzt die eigene lokale Anmeldung (`gh auth login`).

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { tryWriteProtocol } = require('./protocol.cjs');

const GH_INSTALL_URL = 'https://cli.github.com/';
const RELEASES_URL_PATTERN = 'https://github.com/<nutzer>/<repo>/releases';

function parseArgs(argv) {
  const value = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const lang = value('--lang');
  const version = Number(value('--version'));
  const file = value('--file');
  const errors = [];
  if (!lang || !/^[a-z]{2,8}$/.test(lang)) errors.push('--lang fehlt oder ist kein Sprachkürzel (z. B. th).');
  if (!Number.isInteger(version) || version <= 0) errors.push('--version fehlt oder ist keine positive ganze Zahl.');
  if (!file) errors.push('--file fehlt (Pfad zur Paket-Zip).');
  else if (!fs.existsSync(file) || !fs.statSync(file).isFile()) errors.push(`Datei nicht gefunden: ${file}`);
  else if (!file.toLowerCase().endsWith('.zip')) errors.push('--file muss auf .zip enden.');
  for (const flag of ['--lang', '--version', '--file']) {
    const index = argv.indexOf(flag);
    if (index >= 0 && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) errors.push(`${flag} ohne Wert.`);
  }
  if (errors.length) {
    return { ok: false, errors, usage: 'node scripts/pipeline/publish-pack.cjs --lang th --version 1 --file dist/packs/pack-th-v1.zip' };
  }
  return { ok: true, lang, version, file, tag: `pack-${lang}-v${version}`, title: `Sprachpaket ${lang} v${version}` };
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Repo-Kurzform aus dem git-Origin ableiten — nur für die Hinweistexte. */
function originRepo(cwd) {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const match = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch { /* kein Origin gesetzt — Muster bleibt generisch */ }
  return null;
}

function releaseBody({ lang, version, file, sha256, bytes }) {
  return [
    `Sprachpaket ${lang} v${version} — offline-Inhalt der Sprache (Audio, Bilder, Katalog).`,
    '',
    'Prüfung im App-Start (Stand 2026-09-09): Manifest-Validierung + Byteanzahl; der sha256-Abgleich auf dem Gerät folgt mit expo-crypto (Roadmap P2).',
    '',
    `- Datei: ${path.basename(file)}`,
    `- Größe: ${bytes} Byte`,
    `- sha256: ${sha256}`,
    `- Sprache/Version: ${lang} / v${version}`,
  ].join('\n');
}

function checkGh({ run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } = {}) {
  try { run('gh', ['--version']); }
  catch { return { ok: false, reason: 'missing' }; }
  try { run('gh', ['auth', 'status']); }
  catch { return { ok: false, reason: 'unauthenticated' }; }
  return { ok: true };
}

function manualSteps({ lang, version, file, sha256, bytes, repo }) {
  const target = repo ?? '<nutzer>/<repo>';
  const tag = `pack-${lang}-v${version}`;
  return [
    '`gh` ist hier nicht installiert oder nicht angemeldet — der Upload wurde NICHT gestartet.',
    '',
    'Manuelle Schritte (Reihenfolge einhalten):',
    '',
    '1. GitHub CLI installieren: ' + GH_INSTALL_URL + ' (danach Terminal neu starten).',
    '2. Anmelden: `gh auth login` (GitHub.com → HTTPS → Browser-Anmeldung).',
    `3. Release anlegen und Zip hochladen (exakt dieses Tag-Muster: pack-<lang>-v<version>):`,
    '',
    '   ```sh',
    `   gh release create ${tag} "${file}" \\`,
    `     --title "Sprachpaket ${lang} v${version}" \\`,
    `     --notes "sha256: ${sha256} (${bytes} Byte)"`,
    '   ```',
    '',
    `   Falls das Release-Tag schon existiert, nur nachladen: \`gh release upload ${tag} "${file}" --clobber\`.`,
    `4. Prüfen: ${RELEASES_URL_PATTERN.replace('<nutzer>/<repo>', target)} — die Zip muss als Asset unter dem Tag ${tag} hängen.`,
    '',
    'Ohne gh im Browser: ' + RELEASES_URL_PATTERN.replace('<nutzer>/<repo>', target) +
      ` → „Draft a new release" → Tag ${tag} (neu anlegen, main) → Titel „Sprachpaket ${lang} v${version}" →`,
    `   die Zip ${file} anhängen → in die Beschreibung die Zeile „sha256: ${sha256} (${bytes} Byte)" übernehmen → Publish.`,
  ].join('\n');
}

/**
 * main(argv, options) — options nur für Tests:
 *   root: Protokoll-Ort überschreiben (statt Repo-Wurzel)
 *   gh:   checkGh-Ersatz (z. B. () => ({ ok: false, reason: 'missing' }))
 *   log:  Protokoll-Empfänger stubben
 */
function main(argv = process.argv.slice(2), options = {}) {
  const { root, gh = checkGh } = options;
  const log = options.log ?? ((entry) => tryWriteProtocol(entry, root ? { root } : undefined));
  const args = parseArgs(argv);
  if (!args.ok) {
    console.error('Aufruf unvollständig:');
    for (const error of args.errors) console.error('  ' + error);
    console.error(`\nVerwendung: ${args.usage}`);
    return 1;
  }
  const { lang, version, file, tag, title } = args;
  const bytes = fs.statSync(file).size;
  const sha256 = sha256File(file);
  const repo = originRepo(path.resolve(__dirname, '../..'));
  console.log(`Paket: ${file} (${bytes} Byte, sha256 ${sha256})`);
  console.log(`Release: Tag ${tag}, Titel „${title}"${repo ? `, Repo ${repo}` : ''}`);

  const ghResult = gh();
  if (!ghResult.ok) {
    console.error('\n' + manualSteps({ lang, version, file, sha256, bytes, repo }));
    log({
      script: 'publish-pack',
      action: 'release-upload',
      items: 1,
      checks: { gh: ghResult.reason, sha256, bytes },
      result: 'blocked',
      notes: `gh ${ghResult.reason === 'missing' ? 'fehlt' : 'nicht angemeldet'}; manuelle Schritte ausgegeben, kein Upload`,
    });
    return 2;
  }

  const notesFile = path.join(path.dirname(path.resolve(file)), `release-notes-${tag}.md`);
  fs.writeFileSync(notesFile, releaseBody({ lang, version, file, sha256, bytes }) + '\n');
  console.log(`\nlege Release an und lade hoch …`);
  execFileSync('gh', ['release', 'create', tag, file, '--title', title, '--notes-file', notesFile], { stdio: 'inherit' });
  console.log(`\nfertig: ${RELEASES_URL_PATTERN.replace('<nutzer>/<repo>', repo ?? '<nutzer>/<repo>')}/tag/${tag}`);
  log({
    script: 'publish-pack',
    action: 'release-upload',
    items: 1,
    checks: { gh: 'ok', sha256, bytes },
    result: 'ok',
    notes: `Release ${tag} mit ${path.basename(file)} hochgeladen`,
  });
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { parseArgs, checkGh, manualSteps, releaseBody, sha256File, originRepo, main };
