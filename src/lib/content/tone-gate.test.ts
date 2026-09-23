import { VOCABULARY } from '@/test-fixtures/legacy-vocabulary';
import type { Tone } from '@/constants/tones';
import {
  beurteileRegisterProbe,
  checkThaiTone,
  leereRegisterProbe,
  sammleRegisterProbe,
  sollToneFuerClip,
  type ToneCheck,
  type ToneWort,
} from './tone-gate';
import type { AudioClip } from '../clips/types';
import { analyzeToneContour } from '../speaking/analysis';

function sweep(from: number, to: number) {
  let phase = 0;
  return Float32Array.from({ length: 8000 }, (_, i) => {
    phase += 2 * Math.PI * (from + (to - from) * i / 8000) / 8000;
    return Math.sin(phase);
  });
}
const clip = (id: string, extra: Partial<AudioClip> = {}) => ({
  language: 'th', kind: 'vocab', sourceId: id, text: VOCABULARY.find(word => word.id === id)?.term, ...extra,
}) as AudioClip;

test('only verified exact single-syllable text can pass; metadata cannot invent a target', () => {
  const falling = sweep(240, 120);
  expect(checkThaiTone(clip('kha'), falling, 8000)).toMatchObject({ status: 'passed', targetTone: 'falling', sourceId: 'kha' });
  expect(checkThaiTone(clip('kha'), sweep(120, 240), 8000).status).toBe('failed');
  for (const candidate of [clip('sawatdii'), clip('raan'), clip('kha', { text: 'ม้า' }), clip('kha', { kind: 'example' })]) {
    expect(checkThaiTone(candidate, falling, 8000).status).toBe('unchecked');
  }
  expect(checkThaiTone(clip('khrap'), sweep(200, 200), 8000).status).toBe('unchecked');
  expect(checkThaiTone(clip('khrap'), falling, 8000).status).toBe('failed');
});

test('silence and seeded random noise cannot turn weak correlations into a passing tone', () => {
  let state = 91321;
  const noise = Float32Array.from({ length: 32000 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x80000000 - 1;
  });
  expect(analyzeToneContour(noise, 8000).status).toBe('unmeasurable');
  expect(checkThaiTone(clip('kha'), new Float32Array(8000), 8000).status).toBe('unchecked');
});

// ---------------------------------------------------------------------------
// Seit 18.09.: silbenweise Prüfung für den Thai-Massenlauf. Der alte Zustand
// hätte ALLE 2000 Katalogwörter ungeprüft durchgerutscht — kein Bestands-
// kontext, sourceVerified nie gesetzt, Mehrsilber prinzipiell ausgeschlossen.
// ---------------------------------------------------------------------------

/** Eine Silbenfolge als PCM: Sweeps mit wählbarer Stillpause dazwischen. */
function silbenfolge(teile: ({ von: number; bis: number; ms?: number } | { pause: number })[], sampleRate = 8000): Float32Array {
  const stuecke: Float32Array[] = [];
  for (const teil of teile) {
    if ('pause' in teil) {
      stuecke.push(new Float32Array(Math.round((sampleRate * teil.pause) / 1000)));
      continue;
    }
    const n = Math.round((sampleRate * (teil.ms ?? 300)) / 1000);
    let phase = 0;
    stuecke.push(Float32Array.from({ length: n }, (_, i) => {
      phase += (2 * Math.PI * (teil.von + (teil.bis - teil.von) * (i / n))) / sampleRate;
      return Math.sin(phase);
    }));
  }
  return Float32Array.from(stuecke.flatMap((stueck) => [...stueck]));
}

/**
 * Eine Silbenfolge OHNE stimmlose Lücke, aber mit Lautstärke-Einbruch an der
 * Grenze — der Normalfall verbundener Thai-Silben (20.09.).
 */
function verbundeneSilben(
  teile: { von: number; bis: number; ms?: number }[],
  talAnteil = 0.2,
  sampleRate = 8000
): Float32Array {
  const stuecke: number[] = [];
  let phase = 0;
  teile.forEach((teil, nr) => {
    const n = Math.round((sampleRate * (teil.ms ?? 300)) / 1000);
    for (let i = 0; i < n; i++) {
      phase += (2 * Math.PI * (teil.von + (teil.bis - teil.von) * (i / n))) / sampleRate;
      // Am Anfang jeder Silbe (außer der ersten) eine kurze Senke: die
      // Periodizität bleibt, die Energie sackt ab.
      const naheGrenze = nr > 0 && i < Math.round(sampleRate * 0.05);
      stuecke.push(Math.sin(phase) * (naheGrenze ? talAnteil : 1));
    }
  });
  return Float32Array.from(stuecke);
}

const kiWort = (silben: Tone[]): ToneWort => ({
  id: 'ki-th-testwort',
  term: 'ทดสอบ',
  syllables: silben.map((tone) => ({ tone })),
  // KI-Wörter tragen seit dem Publish-Fix 16.09. nie sourceVerified —
  // die Kreuzprüfung steht in der Notiz, und genau die genügt dem Tor.
  verificationNote: 'KI-Kreuzprüfung bestanden (Test)',
});

describe('silbenweise Prüfung gegen den übergebenen Bestand', () => {
  it('prüft ein mehrsilbiges KI-Wort ohne sourceVerified — der Fall des Massenlaufs', () => {
    const wort = kiWort(['falling', 'rising']);
    const passt = checkThaiTone(
      { language: 'th', kind: 'vocab', sourceId: wort.id, text: wort.term },
      silbenfolge([{ von: 240, bis: 120 }, { pause: 150 }, { von: 120, bis: 260 }]),
      8000,
      { woerter: [wort] }
    );
    expect(passt).toMatchObject({ status: 'passed', quelle: 'wort-silben', targetTones: ['falling', 'rising'] });
    expect(passt.silben?.map((silbe) => silbe.form)).toEqual(['geprueft', 'geprueft']);
  });

  it('lehnt ab, wenn eine Silbe dem Sollton klar widerspricht', () => {
    const wort = kiWort(['rising', 'falling']);
    const widerspricht = checkThaiTone(
      { language: 'th', kind: 'vocab', sourceId: wort.id, text: wort.term },
      silbenfolge([{ von: 240, bis: 120 }, { pause: 150 }, { von: 120, bis: 260 }]),
      8000,
      { woerter: [wort] }
    );
    expect(widerspricht.status).toBe('failed');
    expect(widerspricht.reason).toMatch(/Silben? 1/);
  });

  it('bleibt ehrlich ungeprüft, wenn Silben ohne stimmhafte Grenze verbunden sind', () => {
    const wort = kiWort(['falling', 'rising']);
    const verbunden = checkThaiTone(
      { language: 'th', kind: 'vocab', sourceId: wort.id, text: wort.term },
      sweep(200, 200), // ein einziger stimmhafter Zug für zwei Soll-Silben
      8000,
      { woerter: [wort] }
    );
    expect(verbunden.status).toBe('unchecked');
    expect(verbunden.reason).toContain('verbundene Silben');
  });

  it('verschmilzt kurze Einrisse IN einer Silbe, statt die Zuordnung aufzugeben', () => {
    const wort = kiWort(['falling', 'rising']);
    const basis = { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term };
    // Silbe 1 (fallend) mit kurzem Einriss von 100 ms — ohne Merge stünden
    // drei Züge gegen zwei Soll-Silben (nicht eindeutig).
    const eingerissen = checkThaiTone(
      basis,
      silbenfolge([{ von: 240, bis: 170 }, { pause: 100 }, { von: 165, bis: 110 }, { pause: 200 }, { von: 120, bis: 260 }]),
      8000,
      { woerter: [wort] }
    );
    expect(eingerissen.status).toBe('passed');
    // Echte Pausen (beide Lücken über der Merge-Grenze) bleiben getrennt:
    // drei Züge für zwei Silben sind keine eindeutige Zuordnung.
    const zerrissen = checkThaiTone(
      basis,
      silbenfolge([{ von: 240, bis: 170 }, { pause: 320 }, { von: 165, bis: 110 }, { pause: 320 }, { von: 120, bis: 260 }]),
      8000,
      { woerter: [wort] }
    );
    expect(zerrissen.status).toBe('unchecked');
    expect(zerrissen.reason).toContain('nicht eindeutig');
  });

  it('liest die Solltonfolge eines BEISPIELSATZES aus der Roman-Umschrift', () => {
    const wort: ToneWort = {
      id: 'ki-th-satzwort',
      term: 'ลุง',
      syllables: [{ tone: 'mid' }],
      exampleTerm: 'ลุง ช่วย ซ่อม',
      exampleRoman: 'lung chûai sɔ̂ɔm', // [mid, falling, falling]
      verificationNote: 'KI-Kreuzprüfung bestanden (Test)',
    };
    const satz = checkThaiTone(
      { language: 'th', kind: 'example', sourceId: wort.id, text: 'ลุง ช่วย ซ่อม' },
      silbenfolge([{ von: 200, bis: 200 }, { pause: 150 }, { von: 240, bis: 120 }, { pause: 150 }, { von: 240, bis: 120 }]),
      8000,
      { woerter: [wort] }
    );
    expect(satz).toMatchObject({ status: 'passed', quelle: 'satz-roman', targetTones: ['mid', 'falling', 'falling'] });
    // Ein Beispieltext, der nicht zum Wort passt, erfindert keinen Soll.
    const fremd = checkThaiTone(
      { language: 'th', kind: 'example', sourceId: wort.id, text: 'อื่น ๆ' },
      sweep(240, 120),
      8000,
      { woerter: [wort] }
    );
    expect(fremd.status).toBe('unchecked');
  });

  it('meldet Dialogzüge und Wörter ohne gültige Silbentöne ehrlich als ungeprüft', () => {
    const zug = checkThaiTone(
      { language: 'th', kind: 'turn', sourceId: 'situation#1', text: 'สวัสดีครับ' },
      sweep(240, 120),
      8000,
      { woerter: [] }
    );
    expect(zug.status).toBe('unchecked');
    expect(zug.reason).toContain('Dialogzug');
    const kaputt: ToneWort = { id: 'ki-th-kaputt', term: 'เสีย', syllables: [{ tone: 'laut' as Tone }, { tone: 'mid' }], verificationNote: 'KI-Kreuzprüfung bestanden (Test)' };
    expect(sollToneFuerClip({ language: 'th', kind: 'vocab', sourceId: kaputt.id, text: kaputt.term }, [kaputt])).toBeNull();
  });

  it('prüft die Register-Ordnung zwischen Silben desselben Clips — ohne Sprecherreferenz', () => {
    // Konstanttöne nur mit ganzzahliger Periode bei 8 kHz (160/200/320 Hz):
    // sonst fängt die Autokorrelation Suboktaven ein und der Test wird
    // zufällig grün — genau so entging der Richtungs-Bug am 18.09. den Tests.
    // [mid, high]: die hoch-Silbe muss ÜBER der mittel-Silbe liegen.
    const midHigh = kiWort(['mid', 'high']);
    const mid = { language: 'th' as const, kind: 'vocab' as const, sourceId: midHigh.id, text: midHigh.term };
    const passt = checkThaiTone(
      mid,
      silbenfolge([{ von: 200, bis: 200 }, { pause: 150 }, { von: 320, bis: 320 }]),
      8000,
      { woerter: [midHigh] }
    );
    expect(passt.status).toBe('passed');
    expect(passt.ordnung?.erfuellt).toBeGreaterThanOrEqual(1);
    // [low, mid]: tief muss UNTER mittel liegen — derselbe Fall, der im
    // Nutzer-Lauf (แต่งตัว) fälschlich als Widerspruch verworfen wurde.
    const lowMid = kiWort(['low', 'mid']);
    const korrektTief = checkThaiTone(
      { language: 'th' as const, kind: 'vocab' as const, sourceId: lowMid.id, text: lowMid.term },
      silbenfolge([{ von: 160, bis: 160 }, { pause: 150 }, { von: 200, bis: 200 }]),
      8000,
      { woerter: [lowMid] }
    );
    expect(korrektTief.status).toBe('passed');
    expect(korrektTief.ordnung?.erfuellt).toBeGreaterThanOrEqual(1);
    // Und falsch herum gesprochen (tief oben, mittel unten) wird verworfen.
    const falschTief = checkThaiTone(
      { language: 'th' as const, kind: 'vocab' as const, sourceId: lowMid.id, text: lowMid.term },
      silbenfolge([{ von: 200, bis: 200 }, { pause: 150 }, { von: 160, bis: 160 }]),
      8000,
      { woerter: [lowMid] }
    );
    expect(falschTief.status).toBe('failed');
    expect(falschTief.reason).toContain('Register-Ordnung');
    // [high, low] mit der hohen Silbe unten: klarer Widerspruch.
    const falsch = checkThaiTone(
      { language: 'th' as const, kind: 'vocab' as const, sourceId: midHigh.id, text: midHigh.term },
      silbenfolge([{ von: 250, bis: 250 }, { pause: 150 }, { von: 320, bis: 320 }]),
      8000,
      { woerter: [kiWort(['high', 'low'])] }
    );
    expect(falsch.status).toBe('failed');
    expect(falsch.reason).toContain('Register-Ordnung');
  });

  it('bewertet den Übergangs-Fall einer hoch-Silbe vor steigender Silbe nicht als Widerspruch', () => {
    // ซีอิ๊วขาว-Fall (18.09. Diagnose): Die hoch-Silbe fällt zum Übergang in
    // die tief startende steigende Silbe — kein Sprechfehler, sondern Kontext.
    const wort = kiWort(['high', 'rising']);
    const ergebnis = checkThaiTone(
      { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term },
      silbenfolge([{ von: 250, bis: 130 }, { pause: 150 }, { von: 150, bis: 270 }]),
      8000,
      { woerter: [wort] }
    );
    expect(ergebnis.status).toBe('passed');
    expect(ergebnis.silben?.[0]).toMatchObject({ tone: 'high', form: 'knapp' });
    expect(ergebnis.silben?.[1]).toMatchObject({ tone: 'rising', form: 'geprueft' });
  });

  it('verwirft einen fallenden Ton nicht, der erst steigt und dann fällt', () => {
    // เจ้าสาว (jâao-sǎao, coral) — am 20.09. an den echten Clips gemessen:
    // Gipfel bei 40 %, danach 4,1 Halbtöne Abfall, aber Ende−Anfang nur
    // −1,65. Die alte Anfang-Ende-Schwelle verwarf genau diesen korrekt
    // gesprochenen Clip und ließ ihn beim nächsten Lauf erneut bezahlen.
    const wort = kiWort(['falling']);
    const basis = { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term };
    const steigDannFall = checkThaiTone(
      basis,
      silbenfolge([{ von: 190, bis: 240, ms: 120 }, { von: 240, bis: 170, ms: 220 }]),
      8000,
      { woerter: [wort] }
    );
    expect(steigDannFall.status).toBe('passed');
    // Ohne Bewegung bleibt es trotzdem ein Widerspruch: eben ist nicht fallend.
    expect(checkThaiTone(basis, silbenfolge([{ von: 200, bis: 200 }]), 8000, { woerter: [wort] }).status).toBe('failed');
  });

  it('trennt verbundene Silben am Lautstärke-Einbruch, statt sie aufzugeben', () => {
    // 20.09. am echten Bestand gemessen: zu WENIGE stimmhafte Züge waren der
    // häufigste Grund, gar nicht zu prüfen (5 von 17 Zweisilbern, 2 von 2
    // Fünfsilbern) — für Sätze mit im Schnitt sieben Silben entscheidend.
    const wort = kiWort(['falling', 'rising']);
    const basis = { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term };
    const verbunden = checkThaiTone(basis, verbundeneSilben([{ von: 240, bis: 120 }, { von: 120, bis: 260 }]), 8000, { woerter: [wort] });
    expect(verbunden.status).toBe('passed');
    expect(verbunden.silben?.map((silbe) => silbe.form)).toEqual(['geprueft', 'geprueft']);
    expect(verbunden.reason).toContain('Silbengrenze(n) aus dem Lautstärkeverlauf');
    // Ohne Einbruch bleibt es beim ehrlichen „nicht trennbar".
    const ohneTal = checkThaiTone(basis, verbundeneSilben([{ von: 240, bis: 120 }, { von: 120, bis: 260 }], 1), 8000, { woerter: [wort] });
    expect(ohneTal.status).toBe('unchecked');
    expect(ohneTal.reason).toContain('verbundene Silben');
  });

  it('verwirft bei GERATENER Silbengrenze erst den zweiten Widerspruch', () => {
    // อธิบาย (à-thí-baai) wurde am 20.09. verworfen, nachdem die Trennung die
    // dritte Silbe überhaupt erst sichtbar gemacht hatte: eine geratene
    // Grenze verschiebt den Zuschnitt beider Nachbarsilben. Abdeckung ja,
    // Geld kosten nein.
    const wort = kiWort(['rising', 'falling']);
    const basis = { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term };
    // Silbe 1 fällt (Soll steigend) — ein Widerspruch, aber an geratener Grenze.
    const einer = checkThaiTone(basis, verbundeneSilben([{ von: 240, bis: 120 }, { von: 130, bis: 90 }]), 8000, { woerter: [wort] });
    expect(einer.status).toBe('unchecked');
    expect(einer.reason).toContain('nicht beweiskräftig');
    // Bei sicherer Grenze (echte Pause) verwirft derselbe eine Widerspruch.
    const sicher = checkThaiTone(
      basis,
      silbenfolge([{ von: 240, bis: 120 }, { pause: 150 }, { von: 130, bis: 90 }]),
      8000,
      { woerter: [wort] }
    );
    expect(sicher.status).toBe('failed');
  });

  it('vergleicht die Registerlage nur zwischen BENACHBARTEN Silben', () => {
    // Gesprochene Sätze sacken zum Ende hin ab (Deklination). Über mehrere
    // Silben hinweg misst ein Lagenvergleich dieses Absacken statt des Tons:
    // die hohe Silbe 5 liegt hier 3,9 Halbtöne UNTER der tiefen Silbe 1 —
    // über vier Plätze hinweg wäre das ein rechnerischer Widerspruch, obwohl
    // nichts falsch gesprochen ist. Nachbarpaare bleiben stimmig.
    // Frequenzen mit ganzzahliger 8-kHz-Periode, sonst misst die
    // Autokorrelation Suboktav-Artefakte (Testfalle vom 18.09.).
    const wort = kiWort(['low', 'mid', 'mid', 'mid', 'high']);
    const abfallend = checkThaiTone(
      { language: 'th' as const, kind: 'vocab' as const, sourceId: wort.id, text: wort.term },
      silbenfolge([
        { von: 250, bis: 250 }, { pause: 150 }, { von: 8000 / 28, bis: 8000 / 28 }, { pause: 150 },
        { von: 250, bis: 250 }, { pause: 150 }, { von: 8000 / 36, bis: 8000 / 36 }, { pause: 150 },
        { von: 200, bis: 200 },
      ]),
      8000,
      { woerter: [wort] }
    );
    expect(abfallend.ordnung?.widerspruch).toBeUndefined();
    expect(abfallend.status).not.toBe('failed');
    expect(abfallend.ordnung?.erfuellt).toBeGreaterThan(0);
  });

  it('urteilt über die STIMME, sobald die Register-Laufprobe genug Silben hat', () => {
    // Einzeln ist die Lage von mittel/tief/hoch nicht prüfbar — über viele
    // Clips hinweg schon: an den 31 echten Clips lagen tiefe Silben im Mittel
    // −2,0, mittlere −0,0 und hohe +4,6 Halbtöne zur Referenz IHRES Clips.
    const probe = leereRegisterProbe();
    const check = (lagen: { tone: Tone; halbtoene: number }[]) => ({ status: 'passed', reason: '', version: 'test', lagen }) as ToneCheck;
    expect(beurteileRegisterProbe(probe).genug).toBe(false);
    for (let i = 0; i < 25; i++) {
      sammleRegisterProbe(probe, check([{ tone: 'low', halbtoene: -2 }, { tone: 'mid', halbtoene: 0 }, { tone: 'high', halbtoene: 4.6 }]));
    }
    expect(beurteileRegisterProbe(probe)).toMatchObject({ genug: true, getrennt: true });
    expect(beurteileRegisterProbe(probe).abstand).toBeCloseTo(6.6, 1);

    const flach = leereRegisterProbe();
    for (let i = 0; i < 25; i++) {
      sammleRegisterProbe(flach, check([{ tone: 'low', halbtoene: 0.3 }, { tone: 'high', halbtoene: -0.2 }]));
    }
    expect(beurteileRegisterProbe(flach)).toMatchObject({ genug: true, getrennt: false });
    // Einsilber liefern nichts: sie SIND ihre eigene Referenz.
    const leer = leereRegisterProbe();
    sammleRegisterProbe(leer, { status: 'passed', reason: '', version: 'test' });
    expect(beurteileRegisterProbe(leer).genug).toBe(false);
  });

  it('trägt den diagnostischen F0-Track nur auf ausdrücklichen Wunsch', () => {
    const wort = kiWort(['falling']);
    const basis = { language: 'th', kind: 'vocab', sourceId: wort.id, text: wort.term } as const;
    const signal = silbenfolge([{ von: 240, bis: 120 }]);
    expect(checkThaiTone(basis, signal, 8000, { woerter: [wort] }).track).toBeUndefined();
    expect(checkThaiTone(basis, signal, 8000, { woerter: [wort] }, { track: true }).track?.length).toBeGreaterThan(0);
  });
});
