import Anthropic from '@anthropic-ai/sdk';

import { ExamSpec } from './plan';
import { certificateFor, ExamItem, ExamModule, ExamStimulus, SKILL_LABELS } from './types';

/**
 * Erzeugt eine zusätzliche Lese- oder Höraufgabe über die Anthropic-API.
 *
 * Derselbe Aufbau wie der Dialog-Generator aus Phase 4 — offizieller SDK,
 * JSON im Prompt verlangt und streng geprüft, ein Fehlschlag kostet den Lauf
 * nichts. Der Batch-Läufer darunter ist derselbe wie bei Sprachsituationen und
 * Bildern (`lib/generation/batch.ts`).
 *
 * DER PROMPT ZITIERT DIE RECHERCHIERTE STRUKTUR, nicht eine Vorstellung davon:
 * Textsorten und Dauer kommen aus dem Zertifikat, das in `types.ts` mit Quelle
 * und Abrufdatum hinterlegt ist. Damit erfindet auch das Modell die
 * Prüfungsform nicht, sondern bekommt sie vorgegeben.
 */

export const EXAM_GENERATOR_MODEL = 'claude-opus-5';

export type ExamGenerationClient = {
  generate(spec: ExamSpec): Promise<ExamModule>;
};

function systemPrompt(): string {
  return [
    'Du erstellst Übungsaufgaben für die Vorbereitung auf eine Deutschprüfung.',
    'Du antwortest ausschließlich mit einem einzigen JSON-Objekt, ohne',
    'Markdown-Codeblock, ohne Vor- oder Nachtext.',
  ].join(' ');
}

export function buildExamPrompt(spec: ExamSpec): string {
  const certificate = certificateFor(spec.level);
  const part = certificate.parts.find((candidate) => candidate.skill === spec.skill)!;
  const optionCount = spec.taskType === 'trueFalse' ? 2 : 3;

  return `Erstelle eine Übungsaufgabe für ${certificate.name}, Prüfungsteil ${SKILL_LABELS[spec.skill]}.

Die Prüfungsstelle beschreibt diesen Teil so:
"${part.description}"

Niveau: ${spec.level} (Gemeinsamer europäischer Referenzrahmen)
Aufgabenformat: ${
    spec.taskType === 'trueFalse'
      ? 'Aussagen, die mit RICHTIG oder FALSCH beantwortet werden'
      : 'Fragen mit genau drei Antwortmöglichkeiten A, B, C'
  }
Variante: ${spec.variant} (unterscheide dich deutlich von anderen Varianten)

Anforderungen:
- ${
    spec.skill === 'hoeren'
      ? 'Schreibe ein Hörskript: ein kurzer gesprochener Text (Durchsage, Telefonnachricht, kurzes Gespräch), 40 bis 80 Wörter. Er wird vorgelesen, die lernende Person sieht ihn nicht.'
      : 'Schreibe einen kurzen Lesetext (Anzeige, Aushang, E-Mail, kurze Notiz), 40 bis 90 Wörter.'
  }
- Sprachniveau ${spec.level}: einfache Sätze, Alltagswortschatz, keine seltenen Wörter.
- 3 Aufgaben zum Text. Jede muss sich **allein aus dem Text** beantworten lassen.
- Genau ${optionCount} Antwortmöglichkeiten je Aufgabe, davon genau eine richtige.
- Die falschen Antworten müssen plausibel sein, aber im Text eindeutig widerlegt
  oder gar nicht vorkommen. Keine Antwort darf teilweise richtig sein.
- Zu jeder Aufgabe eine kurze Begründung, die auf die Stelle im Text verweist.
- Alles auf Deutsch.

Antworte mit genau diesem JSON-Objekt:
{
  "title": "kurzer Titel",
  "instruction": "Arbeitsanweisung, z. B. 'Lesen Sie die Anzeige. Klicken Sie an.'",
  "stimulusTitle": "Überschrift des Textes oder leer",
  "stimulusBody": "der ${spec.skill === 'hoeren' ? 'gesprochene' : 'gelesene'} Text",
  "items": [
    {
      "prompt": "die Frage${spec.taskType === 'trueFalse' ? ' bzw. die Aussage' : ''}",
      "options": [${
        spec.taskType === 'trueFalse' ? '"Richtig", "Falsch"' : '"A-Text", "B-Text", "C-Text"'
      }],
      "correctIndex": 0,
      "explanation": "kurze Begründung mit Verweis auf den Text"
    }
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
 * Der wichtigste Test ist `correctIndex`: eine Aufgabe, deren richtige Antwort
 * außerhalb der Optionen liegt, wäre nicht nur unbrauchbar, sondern würde
 * jeden Versuch als falsch werten — ein Fehler, der beim Üben wie eigenes
 * Unvermögen aussieht.
 */
export function parseExamModule(
  raw: string,
  spec: ExamSpec,
  modelUsed: string,
  now: number = Date.now()
): ExamModule {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) text = fenced[1].trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Antwort war kein gültiges JSON.');
  }

  const rawItems = data.items;
  if (!Array.isArray(rawItems) || rawItems.length < 2) {
    throw new Error('items fehlt oder hat weniger als zwei Aufgaben.');
  }

  const expectedOptions = spec.taskType === 'trueFalse' ? 2 : 3;

  const items: ExamItem[] = rawItems.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const options = item.options;
    if (!Array.isArray(options) || options.length !== expectedOptions) {
      throw new Error(
        `Aufgabe ${index + 1}: erwartet ${expectedOptions} Antwortmöglichkeiten, ` +
          `bekommen ${Array.isArray(options) ? options.length : 'keine'}.`
      );
    }
    const labels = options.map((option, optionIndex) =>
      asString(option, `items[${index}].options[${optionIndex}]`)
    );
    if (new Set(labels).size !== labels.length) {
      throw new Error(`Aufgabe ${index + 1}: zwei Antwortmöglichkeiten sind gleich.`);
    }
    const correctIndex = item.correctIndex;
    if (
      typeof correctIndex !== 'number' ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= labels.length
    ) {
      throw new Error(
        `Aufgabe ${index + 1}: correctIndex zeigt auf keine der Antwortmöglichkeiten.`
      );
    }
    return {
      id: `${spec.id}-${index + 1}`,
      prompt: asString(item.prompt, `items[${index}].prompt`),
      options: labels,
      correctIndex,
      explanation: asString(item.explanation, `items[${index}].explanation`),
    };
  });

  const certificate = certificateFor(spec.level);
  const part = certificate.parts.find((candidate) => candidate.skill === spec.skill)!;

  const stimulus: ExamStimulus = {
    kind: spec.skill === 'hoeren' ? 'audio' : 'text',
    title: typeof data.stimulusTitle === 'string' ? data.stimulusTitle.trim() : undefined,
    body: asString(data.stimulusBody, 'stimulusBody'),
  };

  return {
    id: spec.id,
    certificate: certificate.id,
    level: spec.level,
    skill: spec.skill,
    direction: 'th_to_de',
    taskType: spec.taskType,
    title: asString(data.title, 'title'),
    instruction: asString(data.instruction, 'instruction'),
    stimulus,
    items,
    // Ein Bruchteil der Zeit, die der ganze Pruefungsteil hat - eine Aufgabe
    // ist nicht der ganze Teil.
    minutes: Math.max(3, Math.round(part.minutes / 4)),
    source: 'generated',
    generatedAt: now,
    modelUsed,
  };
}

export function createExamClient(apiKey: string): ExamGenerationClient {
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    async generate(spec) {
      const response = await anthropic.messages.create({
        model: EXAM_GENERATOR_MODEL,
        max_tokens: 16000,
        output_config: { effort: 'low' },
        system: systemPrompt(),
        messages: [{ role: 'user', content: buildExamPrompt(spec) }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      if (!text.trim()) {
        throw new Error(`Leere Antwort (stop_reason: ${response.stop_reason}).`);
      }

      return parseExamModule(text, spec, response.model ?? EXAM_GENERATOR_MODEL);
    },
  };
}
