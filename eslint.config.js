// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "assets/content/*"],
  },
  {
    // Node-Skripte (scripts/**/*.cjs) und Jest-Umgebung: Die Expo-Grundkonfiguration
    // kennt weder Node- noch Jest-Globals, deshalb meldete der erste Lauf
    // `__dirname`, `Buffer` und `jest` als undefiniert.
    files: ["scripts/**/*.cjs", "jest.setup.js", "**/*.test.{ts,tsx}", "metro.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
]);
