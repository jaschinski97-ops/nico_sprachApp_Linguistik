const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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

// Versuch, den offiziellen Anthropic-SDK aufloesbar zu machen: dessen
// exports-Map fuehrt fuer "./lib/*" nur die Bedingungen import/require, kein
// default. Metro muss diese Bedingungen also kennen.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import', 'default', 'browser'];

// Die Generator-Anbieter (SDK von Anthropic) brauchen node:fs und gehoeren
// NUR in den Web-Dev-Bundle des Inhaltsstudios (AE-10/12): Auf Web loest die
// `browser`-Bedingung darueber hinweg, auf Native wuerde der Bundle schon
// beim Statik-Graph scheitern — auch wenn der Code zur Laufzeit nie erreicht
// wird, weil `isContentDeveloper` dort immer false liefert. Damit der
// Android-/iOS-Build trotzdem laeuft, lenkt Metro Importe des Pakets auf
// Native auf einen projekteigenen Stub um (src/lib/providers/anthropic-stub.ts)
// — gleiche Bundle-Wirkung, das SDK bleibt draussen. Der Stub wirft beim
// Konstruieren eine klare Meldung, statt wie das fruehere leere Modul bei
// einem Fehlgriff kryptisch zu crashen („undefined is not a constructor").
// Der Nutzerfluss (Lernen, Pruefung, Gespräch) importiert das SDK nicht.
const SERVER_ONLY_PACKAGES = [/^@anthropic-ai\/sdk/];
const NATIVE_SDK_STUB = path.resolve(__dirname, 'src/lib/providers/anthropic-stub.ts');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && SERVER_ONLY_PACKAGES.some((pattern) => pattern.test(moduleName))) {
    return { type: 'sourceFile', filePath: NATIVE_SDK_STUB };
  }
  if (defaultResolveRequest) return defaultResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
