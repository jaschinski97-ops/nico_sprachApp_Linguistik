const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function laufeGate(ergebnis) {
  const aufruf = {};
  const processStub = { env: { EAS_BUILD_PROFILE: 'rc-ios' } };
  const warnungen = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'eas-gate.cjs'), 'utf8'), {
    __dirname, process: processStub, console: { error() {}, warn(text) { warnungen.push(text); } },
    require(name) {
      if (name === './check.cjs') return { checkContent(root, options) {
        Object.assign(aufruf, { root, options });
        return ergebnis;
      } };
      return require(name);
    },
  });
  return { aufruf, exitCode: processStub.exitCode, warnungen };
}

test('EAS prüft den Projektordner und blockiert fehlerhafte Inhalte', () => {
  const { aufruf, exitCode } = laufeGate({ errors: ['Fixture: fehlendes Medium'], missing: {} });
  assert.equal(aufruf.root, path.resolve(__dirname, '../..'));
  assert.equal(aufruf.options.integrityOnly, true);
  assert.equal(exitCode, 1);
});

test('Fehlende Bilder oder Situationen warnen nur und blockieren den Build nicht', () => {
  const { exitCode, warnungen } = laufeGate({ errors: [], missing: { images: ['a', 'b'], situations: [], audio: [] } });
  assert.equal(exitCode, undefined);
  assert.match(warnungen.join('\n'), /images 2/);
});
