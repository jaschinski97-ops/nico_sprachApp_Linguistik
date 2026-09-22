// Metro-Worker laden metro.config.js nicht selbst. Die beiden Build-Helfer
// müssen deshalb auch hier installiert sein; Expo bleibt der Transformer.
require('./limit-build-io.cjs').install();
require('./metro-content-assets.cjs').install(require('node:path').join(__dirname, '../assets/content'));
module.exports = require(require('expo/metro-config').unstable_transformerPath);
