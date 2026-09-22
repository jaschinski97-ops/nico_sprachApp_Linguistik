// Metro/Expo liest Asset-Hashes und schreibt Exportdateien parallel.
// 14.000+ Medien überschreiten unter Windows das Limit offener Dateien.
// Nur die Parallelität ändern, Bytes, Optionen und Fehler unverändert lassen.
function limitConcurrency(operation, limit = 32) {
  const queue = [];
  let active = 0;
  function drain() {
    while (active < limit && queue.length) {
      active++;
      queue.shift()();
    }
  }
  return (...args) => new Promise((resolve, reject) => {
    queue.push(() => {
      Promise.resolve().then(() => operation(...args)).then(resolve, reject).finally(() => {
        active--;
        drain();
      });
    });
    drain();
  });
}

function install(io = require('node:fs').promises) {
  const marker = Symbol.for('thaispeaker.buildIoLimit');
  if (io[marker]) return;
  const run = limitConcurrency((operation, args) => operation(...args));
  for (const method of ['readFile', 'writeFile']) {
    const operation = io[method].bind(io);
    io[method] = (...args) => run(operation, args);
  }
  io[marker] = true;
}

module.exports = { limitConcurrency, install };
