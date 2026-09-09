const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { parseArgs, checkGh, manualSteps, releaseBody, main } = require('./publish-pack.cjs');

async function tempDir(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'thaispeaker-publish-pack-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

const fakeZip = (bytes = 'PK Sprachpaket Testinhalt') => ({ name: 'pack-th-v1.zip', bytes });

test('Argument-Parsing: gültiger Aufruf ergibt Tag und Titel', async (t) => {
  const dir = await tempDir(t);
  const zip = path.join(dir, fakeZip().name);
  await fs.writeFile(zip, fakeZip().bytes);
  const args = parseArgs(['--lang', 'th', '--version', '1', '--file', zip]);
  assert.equal(args.ok, true);
  assert.equal(args.lang, 'th');
  assert.equal(args.version, 1);
  assert.equal(args.tag, 'pack-th-v1');
  assert.equal(args.title, 'Sprachpaket th v1');
  assert.equal(args.file, zip);
});

test('Argument-Parsing: fehlende, falsche und nicht existierende Werte werden abgefangen', async (t) => {
  for (const argv of [
    [],
    ['--lang', 'th'],
    ['--lang', 'th', '--version', '0', '--file', 'x.zip'],
    ['--lang', 'th', '--version', '1.5', '--file', 'x.zip'],
    ['--lang', 'TH1', '--version', '1', '--file', 'x.zip'],
    ['--lang', 'th', '--version', '1', '--file', 'fehlt-mit-sicherheit.zip'],
    ['--lang', 'th', '--version', '1', '--file', __filename],
    ['--lang', '--version', '1', '--file', 'x.zip'],
  ]) {
    const result = parseArgs(argv);
    assert.equal(result.ok, false, `muss ablehnen: ${JSON.stringify(argv)}`);
    assert.ok(result.errors.length >= 1);
    assert.match(result.usage, /publish-pack\.cjs --lang/);
  }
});

test('checkGh unterscheidet fehlend, nicht angemeldet und ok (gh-Binary gemockt)', () => {
  assert.deepEqual(checkGh({ run: () => { throw new Error('ENOENT'); } }), { ok: false, reason: 'missing' });
  let calls = 0;
  const authFail = checkGh({ run: (cmd, args) => { calls++; if (args[0] === 'auth') throw new Error('not logged in'); } });
  assert.equal(calls, 2);
  assert.deepEqual(authFail, { ok: false, reason: 'unauthenticated' });
  assert.deepEqual(checkGh({ run: () => 'gh version 2.x' }), { ok: true });
});

test('manuelle Schritte ohne gh: Installlink, URL-Muster, exakte Kommandos, sha256', () => {
  const steps = manualSteps({ lang: 'th', version: 1, file: 'dist/packs/pack-th-v1.zip', sha256: 'abc123', bytes: 456, repo: null });
  assert.match(steps, /cli\.github\.com/);
  assert.match(steps, /https:\/\/github\.com\/<nutzer>\/<repo>\/releases/);
  assert.match(steps, /gh auth login/);
  assert.match(steps, /gh release create pack-th-v1 "dist\/packs\/pack-th-v1\.zip"/);
  assert.match(steps, /--title "Sprachpaket th v1"/);
  assert.match(steps, /gh release upload pack-th-v1/);
  assert.match(steps, /sha256: abc123/);
  // Mit bekanntem Origin wird das konkrete Repo statt des Musters genannt.
  const concrete = manualSteps({ lang: 'th', version: 2, file: 'x.zip', sha256: 'abc', bytes: 1, repo: 'nutzer/thaispeaker' });
  assert.match(concrete, /https:\/\/github\.com\/nutzer\/thaispeaker\/releases/);
});

test('Release-Body trägt Dateiname, Größe und sha256', () => {
  const body = releaseBody({ lang: 'th', version: 1, file: 'dist/packs/pack-th-v1.zip', sha256: 'f'.repeat(64), bytes: 1024 });
  assert.match(body, /pack-th-v1\.zip/);
  assert.match(body, /1024 Byte/);
  assert.match(body, new RegExp(`sha256: ${'f'.repeat(64)}`));
  assert.match(body, /Sprache\/Version: th \/ v1/);
});

test('gh-Missing-Pfad: main endet mit Exit-Code 2, ohne Upload und ohne Dateiänderung am Paket', async (t) => {
  const root = await tempDir(t); // Protokoll landet hier, nicht im echten pipeline/logs
  const zip = path.join(root, fakeZip().name);
  await fs.writeFile(zip, fakeZip().bytes);
  const logs = [];
  const exitCode = main(['--lang', 'th', '--version', '1', '--file', zip], {
    root,
    gh: () => ({ ok: false, reason: 'missing' }),
    log: (entry) => logs.push(entry),
  });
  assert.equal(exitCode, 2);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].script, 'publish-pack');
  assert.equal(logs[0].result, 'blocked');
  assert.equal(await fs.readFile(zip, 'utf8'), fakeZip().bytes);
});

test('echtes CLI ohne installiertes gh: Exit-Code 2 und manuelle Schritte auf der Konsole', async (t) => {
  // Nur laufen lassen, wenn gh tatsächlich fehlt — auf einer Maschine mit
  // angemeldetem gh würde der Test sonst einen echten Release-Upload starten.
  const probe = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (!probe.error && probe.status === 0) { t.skip('gh ist installiert; Rauchtest nur ohne gh.'); return; }
  const root = await tempDir(t);
  const zip = path.join(root, fakeZip().name);
  await fs.writeFile(zip, fakeZip().bytes);
  const run = spawnSync(process.execPath, [path.resolve(__dirname, 'publish-pack.cjs'), '--lang', 'th', '--version', '1', '--file', zip], {
    encoding: 'utf8',
    env: { ...process.env, PIPELINE_PROTOCOL_ROOT: root },
  });
  assert.equal(run.status, 2);
  assert.match(run.stdout, /sha256/);
  assert.match(run.stderr, /cli\.github\.com/);
  assert.match(run.stderr, /gh release create pack-th-v1/);
  // Protokoll des blockierten Laufs liegt im überschriebenen Ort.
  const logsDir = path.join(root, 'pipeline', 'logs');
  const files = await fs.readdir(logsDir);
  assert.ok(files.some((name) => /publish-pack-release-upload/.test(name)));
});
