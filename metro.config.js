const { getDefaultConfig } = require('expo/metro-config');

require('./scripts/limit-build-io.cjs').install();
require('./scripts/metro-content-assets.cjs').install(require('node:path').join(__dirname, 'assets/content'));

const config = getDefaultConfig(__dirname);
config.transformerPath = require.resolve('./scripts/metro-worker.cjs');

// WINDOWS-EMFILE-GEGENMASSNAHME (09.09.2026, Ursache per Messung belegt):
// Ohne Watchman watcht Metros FallbackWatcher JEDES Verzeichnis einzeln
// (fs.watch pro Dir) — 15.262 Verzeichnisse ≈ 15.7k offene Handles im
// Metro-Prozess, schon im Leerlauf. Der zweite Bundle-Lauf liest dann im
// ungedrosselten Cache-Fan-out tausende Dateien parallel dazu → EMFILE.
// Zwei Stellschrauben:
// 1) `config.resolver.useWatchman = true` — die WURZEL: Watchman watcht
//    jeden Root einmal rekursiv (≈ 1 Handle). Wirksam, sobald Watchman
//    installiert ist (z. B. `choco install watchman` oder ZIP von
//    github.com/facebook/watchman/releases); ohne Installation fällt Metro
//    weiterhin auf den FallbackWatcher zurück. Hintergrund: expo#47662,
//    Fix PR #47726 (in @expo/metro-config ≥ 57.0.12).
// 2) `config.cacheStores = []` — SYMPTOM-Beseitigung: nur Arbeitsspeicher-
//    Cache, keine .mp-Cachedateien mehr, deren paralleles Lesen kippt.
//    Folge: Jeder Metro-NEUSTART baut einmal komplett neu (~1–3 Min.),
//    dafuer bleibt eine laufende Sitzung stabil (8/8 Lastladungen ok,
//    Handles konstant). Sobald Watchman steht, kann diese Zeile wieder
//    weg, um den schnellen Festplatten-Cache zurückzuholen. Auf Dauer
//    entschärft die Paket-Architektur das Ganze (Assets nicht eingebettet).
config.resolver.useWatchman = true;
config.cacheStores = [];

// Metros Default fuer zusaetzliche exports-Bedingungen ist eine LEERE Liste
// (node_modules/metro-config/src/defaults) — Pakete mit exports-Map, die nur
// `import`/`require`/`default` anbieten, loesen dann nicht auf. Diese Zeile
// bleibt deshalb bewusst stehen. (`unstable_enablePackageExports` ist seit
// Metro default an und wird hier nicht mehr wiederholt; der fruehere
// Anthropic-SDK-Stub samt resolveRequest-Umleitung ist mit der Entfernung
// des Pakets entfallen — ein versehentlicher SDK-Import bricht jetzt
// sichtbar, statt still auf einen Stub aufzuloesen.)
config.resolver.unstable_conditionNames = ['require', 'import', 'default', 'browser'];

module.exports = config;
