const { test } = require('node:test');
const assert = require('node:assert/strict');
const { limitConcurrency, install } = require('./limit-build-io.cjs');

test('Build-Lesequeue begrenzt Parallelität und gibt nach Fehlern Plätze frei', async () => {
  let active = 0;
  let peak = 0;
  const failure = new Error('Lesefehler');
  const read = limitConcurrency(async (value, option) => {
    assert.equal(option, 'utf8');
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    if (value === 3) throw failure;
    return String(value);
  }, 2);
  const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => read(i, 'utf8')));
  assert.equal(peak, 2);
  assert.equal(results[3].reason, failure);
  assert.equal(results[29].value, '29');
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 29);
});

test('Lesen und Schreiben teilen sich eine Queue; Installation ist idempotent', async () => {
  let active = 0;
  let peak = 0;
  const io = {};
  for (const method of ['readFile', 'writeFile']) {
    io[method] = async function (...args) {
      assert.equal(this, io);
      peak = Math.max(peak, ++active);
      await new Promise(resolve => setImmediate(resolve));
      active--;
      return [method, ...args];
    };
  }
  install(io);
  const read = io.readFile;
  install(io);
  assert.equal(io.readFile, read);
  const results = await Promise.all(Array.from({ length: 200 }, (_, i) =>
    io[i % 2 ? 'readFile' : 'writeFile']('path', i)));
  assert.equal(peak, 32);
  assert.deepEqual(results[0], ['writeFile', 'path', 0]);
  assert.deepEqual(results[199], ['readFile', 'path', 199]);
});
