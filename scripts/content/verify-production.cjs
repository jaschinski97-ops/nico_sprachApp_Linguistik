const fs = require('node:fs');
const path = require('node:path');
function filesUnder(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}
function verify(root) {
  const files = filesUnder(root);
  const maps = files.filter((file) => /entry-.*\.(js|hbc)\.map$/.test(file));
  if (maps.length !== 3) throw Error('Die drei Produktions-Source-Maps für Web, Android und iOS fehlen.');
  const checked = [];
  for (const file of maps) {
    const map = JSON.parse(fs.readFileSync(file, 'utf8'));
    const sources = map.sources.map((source) => source.replaceAll('\\', '/'));
    const forbidden = sources.filter((source) => /src\/(dev\/|components\/generator-card|lib\/(api-key|providers\/(text|image|audio)|content\/rejections))/.test(source));
    if (forbidden.length) throw Error(`Entwicklercode im Produktionsgraph: ${forbidden.join(', ')}`);
    checked.push({ platform: path.basename(path.dirname(file)), modules: sources.length, generatorModules: forbidden.length });
  }
  for (const file of files.filter((file) => /\.(js|html)$/.test(file))) {
    const content = fs.readFileSync(file, 'utf8');
    if (/API-Schlüssel|Schlüssel übernehmen|Generator:|generativelanguage\.googleapis\.com|api\.anthropic\.com|stability-api-key/.test(content)) throw Error(`Schlüssel- oder Anbietercode in ${file}`);
  }
  const settingsIndex = path.join(root, 'settings/index.html');
  const settings = fs.readFileSync(fs.existsSync(settingsIndex)
    ? settingsIndex : path.join(root, 'settings.html'), 'utf8');
  if (/<input\b|<textarea\b|role="progressbar"/.test(settings)) throw Error('Eingabefeld/Fortschrittsbalken in Produktionseinstellungen.');
  return { verifiedAt: new Date().toISOString(), checked, productionSettingsInputs: 0 };
}
if (require.main === module) {
  const root = path.resolve(process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'build-verification/production');
  console.log(JSON.stringify(verify(root), null, 2));
  if (process.argv.includes('--serve')) {
    require('node:http').createServer((req, res) => {
      const relative = new URL(req.url, 'http://localhost').pathname;
      let file = path.resolve(root, '.' + relative);
      if (!path.extname(relative)) {
        const index = path.join(file, 'index.html');
        file = fs.existsSync(index) ? index : file + '.html';
      }
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      try {
        const content = fs.readFileSync(file);
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }[path.extname(file)] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type }); res.end(content);
      } catch { res.writeHead(404); res.end(); }
    }).listen(8083, '127.0.0.1', () => console.log('Produktionsprüfung: http://localhost:8083/settings'));
  }
}
module.exports = { verify };
