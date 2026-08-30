import Anthropic from '@anthropic-ai/sdk';

import {
  ConversationSituation,
  ConversationTurn,
  CorrectionHint,
  SituationSpec,
  TOPIC_LABELS,
} from './types';

/**
 * Erzeugt eine einzelne Sprachsituation über die Anthropic-API.
 *
 * Der Aufruf geht direkt vom Gerät bzw. Browser an die API — es gibt keinen
 * eigenen Server, und der Schlüssel verlässt das Gerät nur in Richtung
 * Anthropic. Im Web-Build setzt `dangerouslyAllowBrowser: true` genau den
 * Header `anthropic-dangerous-direct-browser-access: true`, ohne den CORS die
 * Anfrage blockieren würde (im SDK nachgesehen, nicht angenommen). Nativ ist
 * der Header wirkungslos, aber unschädlich.
 *
 * ANTWORTFORMAT: Es wird JSON im Prompt verlangt und danach **streng
 * geprüft**, statt `output_config.format` zu benutzen. Grund: Die Pipeline
 * ließ sich hier ohne echten Schlüssel nicht gegen die API testen; ein Fehler
 * im Schema-Parameter hätte jeden einzelnen Aufruf zum Scheitern gebracht,
 * während sich eine unerwartete Antwortform hier als *ein* fehlgeschlagener
 * Eintrag zeigt, den der Batch übersteht. Sobald ein echter Lauf die Basis
 * bestätigt, sind strukturierte Ausgaben die natürliche Verbesserung.
 */

export const GENERATOR_MODEL = 'claude-opus-5';

export type GenerationClient = {
  generate(spec: SituationSpec): Promise<ConversationSituation>;
};

function systemPrompt(): string {
  return [
    'Du erstellst Lernmaterial für eine Sprachlern-App für Thai und Deutsch.',
    'Du antwortest ausschließlich mit einem einzigen JSON-Objekt, ohne',
    'Markdown-Codeblock, ohne Vor- oder Nachtext.',
  ].join(' ');
}

function userPrompt(spec: SituationSpec): string {
  const learnerProduces = spec.direction === 'de_to_th' ? 'Thai' : 'Deutsch';
  const learnerNative = spec.direction === 'de_to_th' ? 'Deutsch' : 'Thai';

  return `Erstelle eine Dialogsituation zum Üben.

Thema: ${TOPIC_LABELS[spec.topic]}
Niveau: ${spec.level}
Muttersprache der lernenden Person: ${learnerNative}
Zu übende Sprache (aktiv produzieren): ${learnerProduces}
Variante: ${spec.variant} (unterscheide dich deutlich von anderen Varianten desselben Themas)

Anforderungen:
- 6 bis 10 Gesprächszüge, abwechselnd zwischen "learner" und "partner".
- Der Dialog beginnt mit "partner" oder "learner", je nachdem was natürlicher ist.
- Jeder Zug enthält den Satz auf Thai (thai), die Paiboon-Umschrift mit
  Tonzeichen (roman) und die deutsche Entsprechung (german) — unabhängig
  davon, wer spricht.
- Sprachniveau ${spec.level}: kurze Sätze, Alltagswortschatz, keine seltenen Wörter.
- Höflichkeitspartikel im Thai konsequent verwenden (ครับ / ค่ะ).
- 2 bis 4 Korrektur-Hinweise zu typischen Fehlern, die genau eine Person mit
  Muttersprache ${learnerNative} beim Produzieren von ${learnerProduces} macht.
  ${
    spec.direction === 'de_to_th'
      ? 'Also etwa: Töne, Vokallänge, fehlende Klassifikatoren, Höflichkeitspartikel.'
      : 'Also etwa: Artikel und Genus, Kasus, Verbstellung im Satz, Pluralbildung, Konjugation.'
  }

Antworte mit genau diesem JSON-Objekt:
{
  "title": "kurzer deutscher Titel",
  "setting": "ein bis zwei Sätze Szenenbeschreibung auf Deutsch",
  "scriptTurns": [
    {"speaker": "partner", "thai": "...", "roman": "...", "german": "..."}
  ],
  "corrections": [
    {"issue": "kurze Benennung des Fehlers", "explanation": "Erklärung auf Deutsch"}
  ]
}`;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Feld "${field}" fehlt oder ist leer.`);
  }
  return value.trim();
}

/**
 * Prüft die Antwort streng, bevor sie gespeichert wird.
 *
 * Lieber ein Eintrag als Fehlschlag im Protokoll als eine halbe Situation im
 * Offline-Bestand, die beim Üben auffällt.
 */
export function parseSituation(
  raw: string,
  spec: SituationSpec,
  modelUsed: string,
  now: number = Date.now()
): ConversationSituation {
  let text = raw.trim();
  // Falls doch ein Codeblock kommt: Zäune abstreifen statt zu scheitern.
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) text = fenced[1].trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Antwort war kein gültiges JSON.');
  }

  const turnsRaw = data.scriptTurns;
  if (!Array.isArray(turnsRaw) || turnsRaw.length < 2) {
    throw new Error('scriptTurns fehlt oder hat weniger als zwei Züge.');
  }

  const scriptTurns: ConversationTurn[] = turnsRaw.map((turn, index) => {
    const t = turn as Record<string, unknown>;
    const speaker = t.speaker;
    if (speaker !== 'learner' && speaker !== 'partner') {
      throw new Error(`Zug ${index + 1}: speaker muss "learner" oder "partner" sein.`);
    }
    return {
      speaker,
      thai: asString(t.thai, `scriptTurns[${index}].thai`),
      roman: asString(t.roman, `scriptTurns[${index}].roman`),
      german: asString(t.german, `scriptTurns[${index}].german`),
    };
  });

  if (!scriptTurns.some((turn) => turn.speaker === 'learner')) {
    throw new Error('Kein einziger Zug für die lernende Person — nichts zu üben.');
  }

  const correctionsRaw = Array.isArray(data.corrections) ? data.corrections : [];
  const corrections: CorrectionHint[] = correctionsRaw.map((hint, index) => {
    const h = hint as Record<string, unknown>;
    return {
      issue: asString(h.issue, `corrections[${index}].issue`),
      explanation: asString(h.explanation, `corrections[${index}].explanation`),
    };
  });

  if (corrections.length === 0) {
    throw new Error('Keine Korrektur-Hinweise enthalten.');
  }

  return {
    id: spec.id,
    level: spec.level,
    topic: spec.topic,
    direction: spec.direction,
    title: asString(data.title, 'title'),
    setting: asString(data.setting, 'setting'),
    scriptTurns,
    corrections,
    generatedAt: now,
    modelUsed,
  };
}

export function createAnthropicClient(apiKey: string): GenerationClient {
  const anthropic = new Anthropic({
    apiKey,
    // Setzt den Header `anthropic-dangerous-direct-browser-access: true`.
    // Ohne ihn blockiert CORS den Web-Build; nativ ist er wirkungslos.
    dangerouslyAllowBrowser: true,
  });

  return {
    async generate(spec) {
      const response = await anthropic.messages.create({
        model: GENERATOR_MODEL,
        max_tokens: 16000,
        // Ein kurzer A1/A2-Dialog in vorgegebenem JSON ist eine einfache
        // Aufgabe. Bei 512 Aufrufen im vollen Lauf schlägt der Unterschied
        // zwischen niedrigem und hohem Aufwand spürbar auf Kosten und Dauer
        // durch, ohne dass das Ergebnis darunter litte.
        output_config: { effort: 'low' },
        system: systemPrompt(),
        messages: [{ role: 'user', content: userPrompt(spec) }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      if (!text.trim()) {
        throw new Error(`Leere Antwort (stop_reason: ${response.stop_reason}).`);
      }

      return parseSituation(text, spec, response.model ?? GENERATOR_MODEL);
    },
  };
}
