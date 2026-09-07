const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
