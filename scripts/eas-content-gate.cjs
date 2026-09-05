if (process.env.EAS_BUILD_PROFILE !== 'development') {
  const { checkContent } = require('./check-content.cjs');
  const result = checkContent(require('node:path').resolve(__dirname, '..'));
  if (result.errors.length) {
    console.error('Auslieferung blockiert:\n' + result.errors.join('\n'));
    process.exitCode = 1;
  }
}
