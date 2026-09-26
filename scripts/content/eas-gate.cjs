// EAS-Inhaltsprüfung vor jedem Nicht-Entwicklungs-Build.
//
// BLOCKIERT nur bei Integritätsfehlern (kaputte/fehlende Mediendateien,
// verwaiste Assets, Budget). Fehlende Bilder, Hörclips oder Situationen sind
// seit 26.09. eine WARNUNG (Nutzerentscheidung: Bilder kommen später) — der
// Build läuft weiter, die App zeigt dann eben kein Bild.
if (process.env.EAS_BUILD_PROFILE !== 'development') {
  const { checkContent } = require('./check.cjs');
  const result = checkContent(require('node:path').resolve(__dirname, '../..'), { integrityOnly: true });
  const fehlend = Object.entries(result.missing ?? {}).filter(([, ids]) => ids.length);
  if (fehlend.length) {
    console.warn('Inhalt unvollständig (kein Abbruch): ' + fehlend.map(([kind, ids]) => `${kind} ${ids.length}`).join(', '));
  }
  if (result.errors.length) {
    console.error('Auslieferung blockiert:\n' + result.errors.join('\n'));
    process.exitCode = 1;
  }
}
