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
// Android-/iOS-Build trotzdem laeuft, loest Metro die Pakete auf Native zu
// einem leeren Modul auf; der Nutzerfluss (Lernen, Pruefung, Gespräch)
// importiert sie nicht.
const SERVER_ONLY_PACKAGES = [/^@anthropic-ai\/sdk/];
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && SERVER_ONLY_PACKAGES.some((pattern) => pattern.test(moduleName))) {
    return { type: 'empty' };
  }
  if (defaultResolveRequest) return defaultResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
