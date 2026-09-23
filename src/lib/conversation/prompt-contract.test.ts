import { parseSituation } from './generator';
import { planSituations } from './plan';
import { SituationSpec } from './types';

/**
 * Vertrag zwischen Prompt und Parser.
 *
 * Der Lauf mit ungültigem Schlüssel konnte alles prüfen außer einem: ob eine
 * Antwort, die **genau der im Prompt verlangten Form** folgt, auch durch die
 * Prüfung kommt. Dieser Test schließt die Lücke mit zwei ausformulierten
 * Musterantworten — eine je Lernrichtung —, die der Vorgabe aus
 * `userPrompt()` entsprechen.
 *
 * Er ersetzt keinen echten API-Lauf (siehe Blocker B-3), fängt aber genau den
 * Fehler ab, der sonst erst beim ersten bezahlten Lauf auffiele: dass Prompt
 * und Parser auseinandergelaufen sind.
 */

const specs = planSituations({ variantsPerCombo: 1, directions: ['de_to_th', 'th_to_de'] });

function specFor(direction: SituationSpec['direction']): SituationSpec {
  const found = specs.find((s) => s.topic === 'market' && s.direction === direction);
  if (!found) throw new Error('Kein passender Spec im Plan.');
  return found;
}

/** Deutschsprachige Person übt Thai — Korrekturen zu Tönen und Partikeln. */
const RESPONSE_DE_TO_TH = JSON.stringify({
  title: 'Obst kaufen auf dem Markt',
  setting: 'Ein Marktstand in Chiang Mai am Vormittag. Du möchtest Mangos kaufen.',
  scriptTurns: [
    {
      speaker: 'partner',
      thai: 'สวัสดีค่ะ รับอะไรดีคะ',
      roman: 'sà-wàt-dii khâ, ráp à-rai dii khá',
      german: 'Guten Tag. Was darf es sein?',
    },
    {
      speaker: 'learner',
      thai: 'ขอมะม่วงครับ',
      roman: 'khɔ̌ɔ má-mûang kráp',
      german: 'Ich hätte gern Mangos.',
    },
    {
      speaker: 'partner',
      thai: 'กี่กิโลคะ',
      roman: 'gìi gì-loo khá',
      german: 'Wie viele Kilo?',
    },
    {
      speaker: 'learner',
      thai: 'สองกิโลครับ เท่าไรครับ',
      roman: 'sɔ̌ɔng gì-loo kráp, tâo-rai kráp',
      german: 'Zwei Kilo bitte. Wie viel kostet das?',
    },
    {
      speaker: 'partner',
      thai: 'แปดสิบบาทค่ะ',
      roman: 'bpɛ̀ɛt-sìp bàat khâ',
      german: 'Achtzig Baht.',
    },
    {
      speaker: 'learner',
      thai: 'ขอบคุณครับ',
      roman: 'khɔ̀ɔp-kun kráp',
      german: 'Danke.',
    },
  ],
  corrections: [
    {
      issue: 'Höflichkeitspartikel weggelassen',
      explanation:
        'Ohne ครับ am Satzende klingt die Frage im Thai schroff. Männer sagen ครับ, Frauen ค่ะ — konsequent in jedem Satz.',
    },
    {
      issue: 'Ton bei เท่าไร',
      explanation:
        'tâo trägt den fallenden Ton. Mit mittlerem Ton gesprochen wird das Wort nicht verstanden.',
    },
    {
      issue: 'Klassifikator vergessen',
      explanation:
        'Mengenangaben brauchen im Thai eine Maßeinheit: สองกิโล, nicht nur สอง.',
    },
  ],
});

/** Thaisprachige Person übt Deutsch — Korrekturen zu Artikel, Kasus, Satzstellung. */
const RESPONSE_TH_TO_DE = JSON.stringify({
  title: 'Auf dem Wochenmarkt',
  setting: 'Ein Wochenmarkt in Deutschland. Du möchtest Äpfel kaufen.',
  scriptTurns: [
    {
      speaker: 'partner',
      thai: 'สวัสดีค่ะ ต้องการอะไรคะ',
      roman: 'sà-wàt-dii khâ, dtɔ̂ng-gaan à-rai khá',
      german: 'Guten Morgen! Was darf es sein?',
    },
    {
      speaker: 'learner',
      thai: 'ขอแอปเปิ้ลหนึ่งกิโลครับ',
      roman: 'khɔ̌ɔ ɛ́p-bpə̂n nʉ̀ng gì-loo kráp',
      german: 'Ich möchte ein Kilo Äpfel, bitte.',
    },
    {
      speaker: 'partner',
      thai: 'ได้ค่ะ อย่างอื่นอีกไหมคะ',
      roman: 'dâai khâ, yàang ʉ̀ʉn ìik mǎi khá',
      german: 'Gern. Sonst noch etwas?',
    },
    {
      speaker: 'learner',
      thai: 'ไม่ครับ ขอบคุณครับ ราคาเท่าไรครับ',
      roman: 'mâi kráp, khɔ̀ɔp-kun kráp, raa-kaa tâo-rai kráp',
      german: 'Nein, danke. Was kostet das?',
    },
    {
      speaker: 'partner',
      thai: 'สามยูโรค่ะ',
      roman: 'sǎam yuu-roo khâ',
      german: 'Drei Euro.',
    },
  ],
  corrections: [
    {
      issue: 'Falscher Artikel',
      explanation:
        'Es heißt der Apfel, die Äpfel — nicht das Apfel. Substantive im Deutschen haben ein festes Genus, das mitgelernt werden muss.',
    },
    {
      issue: 'Akkusativ nach möchten',
      explanation:
        'Ich möchte einen Apfel — nicht ein Apfel. Nach möchten steht das Objekt im Akkusativ.',
    },
    {
      issue: 'Verb an zweiter Stelle',
      explanation:
        'Im Hauptsatz steht das Verb immer an zweiter Position: Was kostet das? — nicht Was das kostet?',
    },
  ],
});

describe('Prompt-Vertrag: Musterantwort Deutsch -> Thai', () => {
  const spec = specFor('de_to_th');
  const situation = parseSituation(RESPONSE_DE_TO_TH, spec, 'claude-opus-5', 0);

  it('geht durch die Pruefung', () => {
    expect(situation.id).toBe(spec.id);
    expect(situation.direction).toBe('de_to_th');
    expect(situation.topic).toBe('market');
  });

  it('haelt sich an die geforderte Laenge von 6 bis 10 Zuegen', () => {
    expect(situation.scriptTurns.length).toBeGreaterThanOrEqual(6);
    expect(situation.scriptTurns.length).toBeLessThanOrEqual(10);
  });

  it('wechselt zwischen den Sprechern', () => {
    const speakers = situation.scriptTurns.map((t) => t.speaker);
    for (let i = 1; i < speakers.length; i++) {
      expect(speakers[i]).not.toBe(speakers[i - 1]);
    }
  });

  it('fuehrt in jedem Zug alle drei Sprachfassungen', () => {
    situation.scriptTurns.forEach((turn) => {
      expect(turn.thai.length).toBeGreaterThan(0);
      expect(turn.roman.length).toBeGreaterThan(0);
      expect(turn.german.length).toBeGreaterThan(0);
    });
  });

  it('gibt 2 bis 4 Korrektur-Hinweise', () => {
    expect(situation.corrections.length).toBeGreaterThanOrEqual(2);
    expect(situation.corrections.length).toBeLessThanOrEqual(4);
  });
});

describe('Prompt-Vertrag: Musterantwort Thai -> Deutsch', () => {
  const spec = specFor('th_to_de');
  const situation = parseSituation(RESPONSE_TH_TO_DE, spec, 'claude-opus-5', 0);

  it('geht durch die Pruefung', () => {
    expect(situation.direction).toBe('th_to_de');
    expect(situation.scriptTurns.some((t) => t.speaker === 'learner')).toBe(true);
  });

  it('bringt Korrektur-Hinweise zur deutschen Grammatik, nicht zu Toenen', () => {
    // Der Kern von AE-11: die Hinweise sind richtungsspezifisch. Waeren hier
    // Ton-Hinweise, waere der Prompt fuer diese Richtung falsch.
    const text = situation.corrections.map((c) => `${c.issue} ${c.explanation}`).join(' ');
    expect(text).toMatch(/Artikel|Akkusativ|Kasus|Verb/);
  });
});

describe('Prompt-Vertrag: richtungsspezifische Hinweise', () => {
  it('bringt fuer Deutsch -> Thai Hinweise zu Toenen oder Partikeln', () => {
    const situation = parseSituation(RESPONSE_DE_TO_TH, specFor('de_to_th'), 'm', 0);
    const text = situation.corrections.map((c) => `${c.issue} ${c.explanation}`).join(' ');
    expect(text).toMatch(/Ton|Partikel|Klassifikator/);
  });
});
