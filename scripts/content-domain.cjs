// Execute this repo's pure TypeScript domain modules in Node tooling. No Expo
// runtime or second copy of its validators/content plans is needed.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = (name) => {
    const target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) :
      name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
    if (target && (target.endsWith('.ts') || fs.existsSync(target + '.ts'))) return load(target);
    return require(target ?? name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  }).outputText, file);
  return mod.exports;
}
module.exports = { load: (relative) => load(path.join(root, relative)) };
