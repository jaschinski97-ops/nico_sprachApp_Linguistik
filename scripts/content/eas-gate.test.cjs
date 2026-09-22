const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('EAS prüft den Projektordner und blockiert fehlerhafte Inhalte', () => {
  let checkedRoot;
  const processStub = { env: { EAS_BUILD_PROFILE: 'rc-ios' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'eas-gate.cjs'), 'utf8'), {
    __dirname, process: processStub, console: { error() {} },
    require(name) {
      if (name === './check.cjs') return { checkContent(root) {
        checkedRoot = root;
        return { errors: ['Fixture: fehlendes Medium'] };
      } };
      return require(name);
    },
  });
  assert.equal(checkedRoot, path.resolve(__dirname, '../..'));
  assert.equal(processStub.exitCode, 1);
});
