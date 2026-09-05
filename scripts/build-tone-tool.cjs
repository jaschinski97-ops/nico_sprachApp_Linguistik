const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lib/speaking/analysis.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const output = '// Generated from src/lib/speaking/analysis.ts by scripts/build-tone-tool.cjs. Do not edit.\n' +
  'globalThis.ToneAnalysis = (() => { const exports = {};\n' + compiled + '\nreturn exports; })();\n';
const file = path.join(__dirname, 'tone-analysis.js');
if (process.argv.includes('--check')) {
  // Git may check this generated file out as CRLF on Windows.
  if (fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n') !== output.replaceAll('\r\n', '\n')) throw Error('HTML-Messkern veraltet: node scripts/build-tone-tool.cjs');
} else fs.writeFileSync(file, output);
