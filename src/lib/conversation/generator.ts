import { createTextClient } from '../providers/text';
import { ProviderId, TextClient } from '../providers/types';

import {
  ConversationSituation,
  ConversationTurn,
  CorrectionHint,
  SituationSpec,
  TOPIC_LABELS,
} from './types';

/**
 * Erzeugt eine einzelne Sprachsituation über ein Sprachmodell.
 *
 * Der Aufruf geht direkt vom Gerät bzw. Browser an die API — es gibt keinen
 * eigenen Server, und der Schlüssel verlässt das Gerät nur in Richtung des
 * gewählten Anbieters.
 *
 * SEIT PHASE 10 IST DER ANBIETER WÄHLBAR. Was sich dadurch **nicht** ändert:
 * der Prompt, die strenge Prüfung der Antwort und das Verhalten des
 * Batch-Laufs. Diese Datei kennt keinen Anbieter, sondern nur noch einen
 * `TextClient` — wie der Text zustande kommt, steht in
 * `lib/providers/text.ts`. NUTZERENTSCHEIDUNG 10.09.: Der frühere Default
 * Claude ist aus der Auswahl gefallen; das Modell-Vorgabefeld folgt dem
 * neuen Gruppen-Default Gemini.
 *
 * ANTWORTFORMAT: Es wird JSON im Prompt verlangt und danach **streng
 * geprüft**, statt `output_config.format` zu benutzen. Grund: Die Pipeline
 * ließ sich hier ohne echten Schlüssel nicht gegen die API testen; ein Fehler
 * im Schema-Parameter hätte jeden einzelnen Aufruf zum Scheitern gebracht,
 * während sich eine unerwartete Antwortform hier als *ein* fehlgeschlagener
 * Eintrag zeigt, den der Batch übersteht. Sobald ein echter Lauf die Basis
 * bestätigt, sind strukturierte Ausgaben die natürliche Verbesserung.
 */

/** Voreinstellung, kein Zwang — das Modell ist ein Freitextfeld (Pflicht 5). */
export const GENERATOR_MODEL = 'gemini-2.5-flash';

/**
 * Antwortlänge. Großzügig, weil ein abgeschnittenes JSON den ganzen Eintrag
 * kostet und ein Fehlschlag teurer ist als ein paar ungenutzte Token.
 */
export const GENERATOR_MAX_TOKENS = 16000;

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

/**
 * Verbindet den Prompt dieser Datei mit einem beliebigen Textanbieter.
 *
 * Das ist die ganze Anbieter-Anbindung: eine Anfrage, eine Antwort, der
 * vorhandene Parser. Ein vierter Anbieter bräuchte hier keine Zeile.
 */
export function createSituationClient(text: TextClient): GenerationClient {
  return {
    async generate(spec) {
      const response = await text.complete({
        system: systemPrompt(),
        user: userPrompt(spec),
        maxTokens: GENERATOR_MAX_TOKENS,
      });
      return parseSituation(response.text, spec, response.model);
    },
  };
}

export function createGenerationClient(
  provider: ProviderId,
  apiKey: string,
  model: string = GENERATOR_MODEL
): GenerationClient {
  return createSituationClient(createTextClient(provider, apiKey, model));
}

