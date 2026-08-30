const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Versuch, den offiziellen Anthropic-SDK aufloesbar zu machen: dessen
// exports-Map fuehrt fuer "./lib/*" nur die Bedingungen import/require, kein
// default. Metro muss diese Bedingungen also kennen.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import', 'default', 'browser'];

module.exports = config;
