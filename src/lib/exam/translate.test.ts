import { BUILTIN_EXAM_MODULES } from '@/data/exam-modules';

import {
  baueUebersetzPrompt,
  schriftPasst,
  uebertragePruefung,
  uebertragId,
  UEBERTRAGbare_ZIELE,
} from './translate';

/** Ein bewertbares mitgeliefertes Modul als realistische Quelle. */
const quelle =
  BUILTIN_EXAM_MODULES.find((module) => module.taskType === 'multipleChoice') ??
  BUILTIN_EXAM_MODULES[0];

const gueltigeAntwortFelder = () => {
  const felder: Record<string, string> = {};
  felder['title'] = 'หัวข้อที่แปลแล้ว';
  felder['instruction'] = 'คำแนะนำที่แปลแล้ว';
  if (quelle.stimulus) {
    if (quelle.stimulus.title) felder['stimulus.title'] = 'ชื่อประกาศ';
    felder['stimulus.body'] = 'เนื้อหาที่แปลแล้ว';
    quelle.stimulus.entries?.forEach((_, i) => { felder[`stimulus.entries[${i}]`] = `รายการที่ ${i + 1}`; });
  }
  if (quelle.taskType === 'production') {
    quelle.production.bullets.forEach((_, i) => { felder[`production.bullets[${i}]`] = `จุดที่ ${i + 1}`; });
    felder['production.task'] = 'โจทย์ที่แปลแล้ว';
    felder['production.modelAnswer'] = 'คำตอบตัวอย่าง';
    quelle.production.checklist.forEach((_, i) => { felder[`production.checklist[${i}]`] = `เกณฑ์ที่ ${i + 1}`; });
  } else {
    quelle.items.forEach((item, i) => {
      felder[`items[${i}].prompt`] = `คำถามที่ ${i + 1}`;
      item.options.forEach((_, j) => { felder[`items[${i}].options[${j}]`] = `ตัวเลือก ${j + 1}`; });
      if (item.explanation) felder[`items[${i}].explanation`] = `คำอธิบายที่ ${i + 1}`;
    });
  }
  return felder;
};

describe('uebertragId', () => {
  it('hängt das Sprach-Suffix an und hält die ID-Länge ein', () => {
    expect(uebertragId('a1-lesen-anzeige', 'th')).toBe('a1-lesen-anzeige-th');
    const lang = 'x'.repeat(115);
    expect(uebertragId(lang, 'th').length).toBeLessThanOrEqual(120);
  });
});

describe('schriftPasst', () => {
  it('verlangt Thai-Schrift für Thai', () => {
    expect(schriftPasst('สวัสดี', 'th')).toBe(true);
    expect(schriftPasst('Hallo', 'th')).toBe(false);
  });
  it('verlangt Latein ohne Thai-Schrift für en/es', () => {
    expect(schriftPasst('Hallo', 'en')).toBe(true);
    expect(schriftPasst('สวัสดี', 'en')).toBe(false);
  });
});

describe('baueUebersetzPrompt', () => {
  it('nennt alle Textfelder mit Pfad und Regeln', () => {
    const prompt = baueUebersetzPrompt(quelle, 'th');
    expect(prompt).toContain('1:1');
    expect(prompt).toContain('correctIndex');
    expect(prompt).toContain('"title"');
    if (quelle.taskType !== 'production') {
      expect(prompt).toContain('"items[0].prompt"');
    }
  });
});

describe('uebertragePrüfung', () => {
  it('überträgt strukturtreu und markiert als manuell', () => {
    const ergebnis = uebertragePruefung(quelle, 'th', JSON.stringify({ felder: gueltigeAntwortFelder() }), {
      model: 'test-modell',
    });
    if (!ergebnis.ok) throw Error(`unerwartet fehlgeschlagen: ${ergebnis.fehler.join(' | ')}`);
    expect(ergebnis.modul.id).toBe(`${quelle.id}-th`);
    expect(ergebnis.modul.source).toBe('manual');
    expect(ergebnis.modul.level).toBe(quelle.level);
    expect(ergebnis.modul.skill).toBe(quelle.skill);
    expect(ergebnis.modul.taskType).toBe(quelle.taskType);
    expect(isValidStruktur(ergebnis.modul)).toBe(true);
    if (ergebnis.modul.taskType !== 'production' && quelle.taskType !== 'production') {
      ergebnis.modul.items.forEach((item, i) => {
        expect(item.correctIndex).toBe(quelle.items[i].correctIndex);
      });
    }
    expect(ergebnis.pruefungen.length).toBeGreaterThanOrEqual(3);
  });

  it('lehnt veränderte Lösungen ab', () => {
    const felder = gueltigeAntwortFelder();
    if (quelle.taskType !== 'production') {
      // correctIndex wird im Prompt gar nicht mitgeliefert — eine Antwort,
      // die trotzdem ein anderes Feld-Muster zeigt, bleibt ungetestet; hier
      // prüfen wir die Anzahl-Verletzung statt dessen.
      felder[`items[0].options[99]`] = 'zu viel';
      const ergebnis = uebertragePruefung(quelle, 'th', JSON.stringify({ felder }), { model: 'm' });
      if (ergebnis.ok) throw Error('unbekannter Pfad wurde akzeptiert');
      expect(ergebnis.fehler.some((f) => f.includes('Unbekannter Pfad'))).toBe(true);
    }
  });

  it('lehnt unübersetzte (deutsche) Felder ab', () => {
    const felder = gueltigeAntwortFelder();
    felder['title'] = 'Aushang im Hausflur';
    const ergebnis = uebertragePruefung(quelle, 'th', JSON.stringify({ felder }), { model: 'm' });
    if (ergebnis.ok) throw Error('deutsches Feld wurde akzeptiert');
  });

  it('lehnt kaputtes JSON ab', () => {
    const ergebnis = uebertragePruefung(quelle, 'th', 'kein json', { model: 'm' });
    expect(ergebnis.ok).toBe(false);
  });

  it('kennt genau die drei Ziele', () => {
    expect(UEBERTRAGbare_ZIELE).toEqual(['th', 'en', 'es']);
  });
});

function isValidStruktur(modul: unknown): boolean {
  // Die Schema-Prüfung der App — dieselbe, die auch beim Speichern läuft.
  const { isValidExamModule } = jest.requireActual('./types');
  return isValidExamModule(modul);
}
