#!/usr/bin/env node
// Generiert den Brücken-Pool einer Oberflächensprache (Ankerwörter je Begriff)
// — die zweite Hälfte der Sprach-Pipeline neben generate-ui-language.cjs.
//
// Aufruf:  node scripts/content/generate-bridge-vocab.cjs ar
//
// WARUM: Ein Nutzer mit arabischer Oberfläche soll Karteikarten mit arabischer
// VORDERSEITE bekommen (Stufe 1: Brückenwort vorne, Zielform hinten). Dazu
// braucht jeder Begriff (concept) das Wort der Brückensprache. Die Begriffe
// existieren bereits — die 84 Thai-Anker von VOCABULARY_TH, auf die die
// en/es-Einträge über `concept` verweisen. Dieses Skript erzeugt zu JEDERM
// Begriff das arabische Wort und schreibt vocabulary-ar.ts. Das Ergebnis ist
// generiert, nicht handgeschrieben, und trägt den GENERATED-Header.
//
// KOPPLUNG (dieselbe Wahrheit wie in review-session/goals): Ein BridgeEntry
// trägt die ID des Thai-Ankers als `concept`; die Karteikopplung findet über
// genau diese ID statt.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const { loadEnvLocal } = require('../pipeline/env.cjs');
const { load } = require('./domain.cjs');

loadEnvLocal({ root });

// Brückensprachen, die es gibt bzw. geben wird. Eine neue = ein Eintrag + Lauf.
const BRUECKEN = {
  ar: {
    datei: path.join(root, 'src', 'data', 'vocabulary-ar.ts'),
    sprachName: 'Ägyptisch-Arabisch',
    stil: 'Ägyptisches Arabisch, wie in Kairo gesprochen',
    // Prüfung der Antwort: Ein Ankerwort OHNE arabische Schrift ist ein
    // Fehlschlag (etwa eine Umschrift oder eine englische Erklärung).
    schrift: /\p{Script=Arabic}/u,
  },
};

const MODELL = 'gpt-4o-mini';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const CHUNK_GROESSE = 20;
const RETRIES = 2;

/**
 * Alle Begriffe sammeln — Anker ist der Thai-Eintrag (deutsches Wort +
 * Beispiel als Kontext), ergänzt um die en/es-Wörter desselben Begriffs.
 */
function sammleBegriffe() {
  const { VOCABULARY_TH, VOCABULARY_EN, VOCABULARY_ES } = load('src/data/vocabulary.ts');
  const begriffe = new Map();
  for (const eintrag of VOCABULARY_TH) {
    begriffe.set(eintrag.id, {
      id: eintrag.id,
      deutsch: eintrag.german,
      beispiel: eintrag.exampleGerman ?? null,
      wortart: eintrag.partOfSpeech,
      andere: [],
    });
  }
  // en/es-Einträge mit concept liefern Zusatzkontext (und wären ohne
  // Thai-Anker selbst der Kontext — defensively mitbehandelt).
  for (const eintrag of [...VOCABULARY_EN, ...VOCABULARY_ES]) {
    if (eintrag.concept === undefined) continue;
    const begriff = begriffe.get(eintrag.concept);
    if (begriff) {
      begriff.andere.push(eintrag.term);
    } else {
      console.warn(
        `⚠ Concept "${eintrag.concept}" (${eintrag.id}) hat keinen Thai-Anker — Begriffskontext aus dem Eintrag selbst.`
      );
      begriffe.set(eintrag.concept, {
        id: eintrag.concept,
        deutsch: eintrag.german,
        beispiel: null,
        wortart: eintrag.partOfSpeech,
        andere: [eintrag.term],
      });
    }
  }
  return [...begriffe.values()];
}

async function rufeOpenAI(apiKey, ziel, chunk) {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `Du lieferst Ankerwörter für eine Lern-App auf ${ziel.sprachName} ` +
            `(Stil: ${ziel.stil}). Zu jedem Begriff gibst du DAS Wort, das ` +
            'muttersprachlich dafür benutzt wird — das gewöhnliche Wort, kein ' +
            'Fachbegriff und keine Umschrift. Antworte NUR mit einem JSON-Objekt: ' +
            '{ "<begriffs-id>": { "term": "<wort>" }, ... } — dieselben IDs wie die Eingabe, keine fehlen.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            Object.fromEntries(
              chunk.map((begriff) => [
                begriff.id,
                {
                  deutsch: begriff.deutsch,
                  beispiel: begriff.beispiel,
                  wortart: begriff.wortart,
                  // Die vorhandenen Wörter anderer Brückensprachen entschärfen
                  // Mehrdeutigkeiten (etwa „bank" Geldhaus/Gelsitzbank).
                  weitereBrueckenwoerter: begriff.andere.length > 0 ? begriff.andere : undefined,
                },
              ])
            )
          ),
        },
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = await response.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error('Antwort war kein gültiges JSON');
  }
  return { antwort: parsed, usage: data.usage ?? null };
}

/** Gültiges Ankerwort: nicht-leer und in der Schrift der Brückensprache. */
function gueltig(ziel, wert) {
  return (
    typeof wert === 'string' &&
    wert.trim().length > 0 &&
    wert.trim().length <= 40 &&
    ziel.schrift.test(wert)
  );
}

async function uebersetzeChunk(apiKey, ziel, chunk) {
  let offene = chunk;
  const ergebnis = {};
  let usage = null;
  for (let versuch = 0; versuch <= RETRIES && offene.length > 0; versuch++) {
    if (versuch > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * versuch));
      console.warn(`  Wiederholung ${versuch}/${RETRIES} für ${offene.length} Begriffe …`);
    }
    try {
      const { antwort, usage: neuUsage } = await rufeOpenAI(apiKey, ziel, offene);
      if (neuUsage) usage = neuUsage;
      offene = offene.filter((begriff) => {
        const wert = antwort[begriff.id]?.term;
        if (gueltig(ziel, wert)) {
          ergebnis[begriff.id] = wert.trim();
          return false;
        }
        return true;
      });
    } catch (error) {
      console.warn(`  Chunk-Fehler: ${error.message}`);
    }
  }
  return { ergebnis, fehlen: offene.map((begriff) => begriff.id), usage };
}

async function main() {
  const code = process.argv[2];
  const ziel = BRUECKEN[code];
  if (!ziel) {
    console.error(
      `Unbekannte Brückensprache "${code ?? ''}". Verfügbar: ${Object.keys(BRUECKEN).join(', ')}`
    );
    process.exit(1);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY fehlt (.env.local oder Umgebung).');
    process.exit(1);
  }

  const begriffe = sammleBegriffe();
  console.log(
    `Generiere ${begriffe.length} Ankerwörter für ${ziel.sprachName} (${MODELL}, Chunks à ${CHUNK_GROESSE}) …`
  );

  const woerter = {};
  let fehlenGesamt = [];
  let tokensIn = 0;
  let tokensOut = 0;
  for (let i = 0; i < begriffe.length; i += CHUNK_GROESSE) {
    const chunk = begriffe.slice(i, i + CHUNK_GROESSE);
    const { ergebnis, fehlen, usage } = await uebersetzeChunk(apiKey, ziel, chunk);
    Object.assign(woerter, ergebnis);
    fehlenGesamt = fehlenGesamt.concat(fehlen);
    if (usage) {
      tokensIn += usage.prompt_tokens ?? 0;
      tokensOut += usage.completion_tokens ?? 0;
    }
    console.log(`  Chunk ${i / CHUNK_GROESSE + 1}/${Math.ceil(begriffe.length / CHUNK_GROESSE)} fertig`);
  }
  if (fehlenGesamt.length > 0) {
    // Ehrlichkeit geht vor Vollzahl: Ein Begriff ohne Ankerwort bleibt draußen
    // (keine Karten ohne Vorderseite) — kein deutscher Fake-Ersatz.
    console.warn(
      `⚠ ${fehlenGesamt.length} Begriffe ohne Ankerwort, werden ausgelassen: ${fehlenGesamt.join(', ')}`
    );
  }

  const eintraege = begriffe
    .filter((begriff) => woerter[begriff.id] !== undefined)
    .map((begriff) => ({
      id: `ar_${begriff.id}`,
      concept: begriff.id,
      term: woerter[begriff.id],
    }));

  const zeilen = eintraege
    .map(
      (eintrag) =>
        `  { id: ${JSON.stringify(eintrag.id)}, concept: ${JSON.stringify(eintrag.concept)}, term: ${JSON.stringify(eintrag.term)} },`
    )
    .join('\n');
  const kopf = [
    `// GENERIERT von scripts/content/generate-bridge-vocab.cjs — Ankerwörter der Brücke ${code} (${ziel.sprachName}); nicht von Hand editieren.`,
    `// Stil: ${ziel.stil}. Jeder Eintrag verweist über \`concept\` auf den Thai-Anker desselben Begriffs`,
    '// (Kopplung siehe review-session.ts und goals.ts). Stand: ' +
      `${eintraege.length} von ${begriffe.length} Begriffen.`,
    '',
  ].join('\n');
  const inhalt =
    `${kopf}import { BridgeEntry } from './vocab-types';\n\n` +
    `export const VOCABULARY_AR: BridgeEntry[] = [\n${zeilen}\n];\n`;
  fs.mkdirSync(path.dirname(ziel.datei), { recursive: true });
  fs.writeFileSync(ziel.datei, inhalt, 'utf8');

  console.log(
    `Geschrieben: ${path.relative(root, ziel.datei)} — ${eintraege.length} Einträge` +
      (tokensIn ? `, ~${tokensIn}+${tokensOut} Token (~$${((tokensIn / 1e6) * 0.15 + (tokensOut / 1e6) * 0.6).toFixed(4)})` : '')
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
