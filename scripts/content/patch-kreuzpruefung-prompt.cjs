#!/usr/bin/env node
// Einmal-Patch: Kreuzprüfungs-Prompt präzisieren (es-Betonung, Hauptbedeutung, Frequenz).
// Wirft bei jedem nicht gefundenen Anker — nichts halb angewendet.
const fs = require('fs');
const path = require('path');

const DATEI = path.join(__dirname, '..', '..', 'src', 'lib', 'content', 'kreuzpruefung.ts');
let src = fs.readFileSync(DATEI, 'utf8');
const original = src;

function ersetze(anker, neu, erwartet) {
  const teile = src.split(anker);
  if (teile.length - 1 !== erwartet) {
    throw new Error(`Anker ${teile.length - 1}x gefunden (erwartet ${erwartet}): ${anker.slice(0, 80)}…`);
  }
  src = src.split(anker).join(neu);
}

// 1) Batch Punkt 1: Hauptbedeutung genügt (Single-Zeile wurde schon per Edit geändert).
ersetze(
  `'1. Übersetzung: stimmt die deutsche Bedeutung zum Begriff (und umgekehrt)?',`,
  `'1. Übersetzung: stimmt die deutsche Bedeutung zum Begriff (und umgekehrt)? Es genügt EINE korrekte Hauptbedeutung — nicht alle Bedeutungsnuancen.',`,
  1,
);

// 2) Punkt 3 Single: es-Betonung präzisieren (stressed-Feld ist die Quelle, kein Apostroph-Zwang).
ersetze(
  `eintrag.language === 'es' ? 'ist die Silbentrennung mit korrekter Betonungssilbe?' : 'ist die Lautschrift plausibel?'`,
  `eintrag.language === 'es' ? 'stimmt die im Feld "syllables" als "stressed" markierte Silbe mit den spanischen Betonungsregeln? Eine Betonungsmarkierung in der Umschrift ist nicht erforderlich.' : 'ist die Lautschrift plausibel?'`,
  1,
);

// 3) Punkt 3 Batch: dieselbe Präzisierung.
ersetze(
  `eintraege[0]?.language === 'es' ? 'ist die Silbentrennung mit korrekter Betonungssilbe?' : 'ist die Lautschrift plausibel?'`,
  `eintraege[0]?.language === 'es' ? 'stimmt die im Feld "syllables" als "stressed" markierte Silbe mit den spanischen Betonungsregeln? Eine Betonungsmarkierung in der Umschrift ist nicht erforderlich.' : 'ist die Lautschrift plausibel?'`,
  1,
);

// 4) Punkt 5 (Single + Batch, identische Zeile): Mehrdeutigkeit ist kein Frequenz-Ausschluss.
ersetze(
  `'5. Passung: ist das Wort ein grundlegender, hochfrequenter Alltagsbegriff (ohne feste Niveaustufe)?',`,
  `'5. Passung: ist das Wort ein grundlegender, hochfrequenter Alltagsbegriff (ohne feste Niveaustufe)? Mehrdeutigkeit schließt hohe Frequenz nicht aus.',`,
  2,
);

if (src === original) throw new Error('NICHTS geändert — Anker prüfen.');
fs.writeFileSync(DATEI, src);
console.log('OK: 4 Ersetzungen (Punkt 1 Batch, Punkt 3 Single+Batch, Punkt 5 ×2) geschrieben.');
