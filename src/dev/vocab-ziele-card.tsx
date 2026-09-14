import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/generator-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createTextClient } from '@/lib/providers/text';
import { defaultModelFor, loadGeneratorSettings } from '@/lib/providers/settings';
import {
  pruefeVocabKreuz,
  schluesselPruefer,
} from '@/lib/content/kreuzpruefung';
import { loadApiKey } from '@/lib/api-key';
import { estimateRunCost } from './run-cost';
import { studioRequest } from './content-client';
import { loadVocabulary, writeMeta } from '@/lib/repository';
import {
  pruefeVocabDoc,
  vocabSchluessel,
} from '@/lib/content/vocab-schema';
import type { VocabEntry } from '@/data/vocab-types';
import { LANGUAGE_CODES, type LanguageCode } from '@/lib/languages/types';

/**
 * Wortschatz mit festlegbarer Zielgröße (Phase 2, Schritt 4).
 *
 * JE Sprache ein eigenes Ziel (250 / 500 / 1.000 / 2.000 oder freie Zahl) —
 * angezeigt wird vorhanden / Ziel / fehlt, erzeugt werden nur die fehlenden
 * Wörter, in Paketen (z. B. 50) mit Thema und Stufe. Der Lauf schlägt die
 * neuen Begriffe als Katalog-Art `vocabulary` über Stage UND catalog.json
 * ein (dieselbe Regel wie für Clips); geprüfte Begriffe landen mit dem
 * nächsten App-Bundle im Lernbestand (GEBUENDELTE-Regel).
 *
 * Der Lauf ist KOSTENPFLICHTIG: Anzahl, Anbieter und Kostenschätzung
 * stehen vor dem Start, der erste Knopfdruck bestätigt nur.
 */

const SPRACHEN: { code: LanguageCode; label: string }[] = LANGUAGE_CODES.map((code) => ({
  code,
  label: { th: 'Thai', en: 'Englisch', es: 'Spanisch', de: 'Deutsch' }[code as LanguageCode] ?? code,
}));

const ZIEL_PRESETS = [250, 500, 1000, 2000];
const STUFEN = ['A1', 'A2', 'B1'] as const;
type Stufe = (typeof STUFEN)[number];

type LaufErgebnis = {
  erzeugt: number;
  kreuzGeprueft: number;
  einfachGeprueft: number;
  kreuzAbgelehnt: number;
  duplikate: number;
  aussortiert: number;
};

/** Sieben Zeichen stabiler Hash für KI-Vokabel-IDs. */
function kurzHash(text: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h1 ^= text.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0').slice(0, 8);
}

/** Der Erzeugungs-Prompt: Vertrags-JSON mit sprachspezifischen Pflichten. */
function baueWortschatzPrompt(options: {
  sprache: LanguageCode;
  anzahl: number;
  thema: string;
  stufe: Stufe;
  bekannte: string[];
}): string {
  const { sprache, anzahl, thema, stufe, bekannte } = options;
  const sprachRegeln: Record<string, string> = {
    th: '- "term" in thailändischer Schrift; "syllables" mit JEDER Silbe als { "roman": Umschrift, "tone": "mid"|"low"|"falling"|"high"|"rising" }; "romanization" als Paiboon-artige Umschrift des ganzen Wortes.',
    en: '- "ipa" mit IPA-Lautschrift (RP); "syllables" als [{ "roman": "/" + IPA + "/" }].',
    es: '- "syllables" mit Silbentrennung und "stressed": true auf der betonten Silbe; spanische Nomen mit "spanishNoun" { "gender": "m"|"f", "article": "el"|"la", "plural": "…" }, Verben mit "spanishVerb" { "conjugation": "ar"|"er"|"ir", "irregular": true|false }.',
    de: '—',
  };
  return [
    `Erzeuge genau ${anzahl} Einträge eines ${stufe}-Wortschatzes für Lernende, die ${sprache.toUpperCase()} lernen.`,
    thema ? `Thema: „${thema}".` : 'Thema: grundlegende, hochfrequente Wörter und feste Wendungen des Alltags — häufige Wörter zuerst.',
    'Keine Eigennamen, keine Markennamen, keine vulgären Ausdrücke, keine Duplikate innerhalb der Liste.',
    '',
    'Antworte NUR mit JSON:',
    '{ "woerter": [',
    '  {',
    '    "term": "Wort in der Zielsprache",',
    '    "romanization": "Lesehilfe",',
    '    "german": "deutsche Bedeutung",',
    '    "partOfSpeech": "noun|verb|adjective|adverb|pronoun|numeral|particle|preposition|conjunction|interjection",',
    '    "register": "neutral"|"formal"|"informal",',
    '    "isConcrete": true|false,',
    '    "exampleTerm": "Beispielsatz in der Zielsprache",',
    '    "exampleRoman": "Umschrift des Beispielsatzes",',
    '    "exampleGerman": "deutsche Übersetzung des Beispielsatzes",',
    '    "syllables": [ … ],',
    '    … sprachspezifische Felder siehe unten …',
    '  }',
    '] }',
    '',
    `Sprachregeln für ${sprache}:`,
    sprachRegeln[sprache] ?? '',
    '',
    `Ausschlussliste — diese Begriffe existieren bereits und dürfen NICHT vorkommen:`,
    bekannte.slice(0, 300).join(' | '),
  ].join('\n');
}

export function VocabZieleCard({ onFinished }: { onFinished: () => void }) {
  const theme = useTheme();
  const [sprache, setSprache] = useState<LanguageCode>('th');
  const [ziele, setZiele] = useState<Partial<Record<string, number>>>({});
  const [bestand, setBestand] = useState<Partial<Record<string, number>> | null>(null);
  const [paketText, setPaketText] = useState('50');
  const [thema, setThema] = useState('');
  const [stufe, setStufe] = useState<Stufe>('A1');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'confirm'>('idle');
  const [meldung, setMeldung] = useState('');
  const [ergebnis, setErgebnis] = useState<LaufErgebnis | null>(null);

  const ladeBestand = useCallback(async () => {
    const alle = await loadVocabulary();
    const zahlen: Partial<Record<string, number>> = {};
    for (const code of LANGUAGE_CODES) zahlen[code] = alle.filter((e) => e.language === code).length;
    // Deutsch: der abgeleitete Pool trägt language 'de' (KI) — zählen, wenn da.
    zahlen.de = alle.filter((e) => (e as { language: string }).language === 'de').length;
    setBestand(zahlen);
    return zahlen;
  }, []);

  useEffect(() => {
    void ladeBestand();
  }, [ladeBestand]);

  const ziel = ziele[sprache] ?? 250;
  const vorhanden = bestand?.[sprache] ?? 0;
  const fehlt = Math.max(0, ziel - vorhanden);

  const zielSetzen = (wert: number) => {
    setZiele((alt) => ({ ...alt, [sprache]: wert }));
    void writeMeta(`vocabZiel-${sprache}`, wert).catch(() => {});
  };

  const paket = Math.max(1, Number.parseInt(paketText, 10) || 50);

  const erzeugen = useCallback(async () => {
    setRunning(true);
    setMeldung('');
    setPhase('idle');
    try {
      const bestandJetzt = await ladeBestand();
      const vorhandenJetzt = bestandJetzt[sprache] ?? 0;
      const zielJetzt = ziele[sprache] ?? 250;
      const anzahl = Math.min(paket, Math.max(0, zielJetzt - vorhandenJetzt));
      if (anzahl <= 0) {
        setMeldung('Nichts zu erzeugen — das Ziel ist erreicht.');
        return;
      }

      const settings = await loadGeneratorSettings();
      const { provider, model } = settings.situations;
      const apiKey = (await loadApiKey(provider)) ?? '';
      const client = createTextClient(provider, apiKey, model);
      // Kreuzprüfung vorbereiten (Phase 2, Schritt 5): der ANDERE Anbieter
      // prüft; fehlt dessen Schlüssel, prüft der Erzeuger selbst zweimal
      // („einfach geprüft“).
      const schluessel: Partial<Record<string, string | null>> = {
        gemini: await loadApiKey('gemini'),
        chatgpt: await loadApiKey('chatgpt'),
        'chatgpt-helper': 'serverseitig',
      };
      const hatSchluessel = (anbieter: string): boolean => Boolean(schluessel[anbieter]);
      const clientFuer = (anbieter: ReturnType<typeof defaultModelFor> extends never ? never : Parameters<typeof defaultModelFor>[0]) =>
        createTextClient(
          anbieter,
          (schluessel[anbieter] ?? '') as string,
          defaultModelFor(anbieter, 'text')
        );

      const alle = await loadVocabulary();
      const bekannte = alle
        .filter((e) => (e as { language: string }).language === sprache)
        .map((e) => e.term);

      const antwort = await client.complete({
        system:
          'Du erzeugst Lernwortschatz als JSON und hältst dich EXAKT an das geforderte Schema. Keine Duplikate, keine Eigennamen, häufige Wörter zuerst.',
        user: baueWortschatzPrompt({ sprache, anzahl, thema, stufe, bekannte }),
        maxTokens: 8000,
      });

      const roh = antwort.text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      const geparst = JSON.parse(roh) as { woerter?: unknown[] };
      if (!Array.isArray(geparst.woerter)) throw Error('Antwort enthält keine "woerter"-Liste.');

      const vorhandenSchluessel = new Set(
        alle.filter((e) => (e as { language: string }).language === sprache)
          .map((e) => vocabSchluessel(e.term, sprache))
      );
      // Phase 2, Schritt 6: auch der STAGE zählt als vorhanden — Einträge,
      // die im nächsten Export ohnehin übernommen würden, sind Duplikate.
      try {
        const zustand = await studioRequest<{
          stage: { entries: { kind: string; document: { term?: string } }[] };
        }>('/state');
        for (const eintrag of zustand.stage.entries) {
          if (eintrag.kind === 'vocabulary' && typeof eintrag.document?.term === 'string') {
            vorhandenSchluessel.add(vocabSchluessel(eintrag.document.term, sprache));
          }
        }
      } catch {
        // Ohne Helper bleibt der Vergleich beim lokalen Bestand.
      }
      const laufSchluessel = new Set<string>();
      const resultat: LaufErgebnis = { erzeugt: 0, kreuzGeprueft: 0, einfachGeprueft: 0, kreuzAbgelehnt: 0, duplikate: 0, aussortiert: 0 };

      for (const rohEintrag of geparst.woerter) {
        const kandidat = rohEintrag as Record<string, unknown>;
        const term = String(kandidat.term ?? '');
        const schluessel = vocabSchluessel(term, sprache);
        if (!term || vorhandenSchluessel.has(schluessel) || laufSchluessel.has(schluessel)) {
          resultat.duplikate += 1;
          continue;
        }
        const eintrag: VocabEntry = {
          ...(kandidat as unknown as VocabEntry),
          id: `ki-${sprache}-${kurzHash(schluessel)}`,
          language: sprache,
          concept: `ki-${sprache}-${kurzHash(schluessel)}`,
          register: (kandidat.register as VocabEntry['register']) ?? 'neutral',
          isConcrete: Boolean(kandidat.isConcrete),
          sourceVerified: false,
          verificationNote: 'KI-Erzeugung, einfach geprüft (Schema + Schrift + Regeln).',
          syllables: Array.isArray(kandidat.syllables) ? (kandidat.syllables as VocabEntry['syllables']) : [],
        };
        const pruefung = pruefeVocabDoc(eintrag);
        if (!pruefung.ok) {
          resultat.aussortiert += 1;
          continue;
        }
        // Phase 2, Schritt 5: der ANDERE Anbieter prüft Übersetzung,
        // Grammatik, Umschrift/Ton/Betonung, Natürlichkeit und Stufe. Nur
        // Kreuzbestandenes gilt als „geprüft“; ohne zweiten Schlüssel läuft
        // die Selbstprüfung (zweiter Durchlauf) und der Eintrag bleibt
        // „einfach geprüft“ — durchgefallene Einträge werden verworfen.
        const kreuz = await pruefeVocabKreuz(
          eintrag,
          stufe,
          provider,
          hatSchluessel,
          clientFuer
        );
        if (kreuz.kreuz && kreuz.geprueft) {
          eintrag.sourceVerified = true;
          eintrag.verificationNote = `KI-Kreuzprüfung bestanden (${provider} erzeugt, zweiter Anbieter geprüft).`;
          resultat.kreuzGeprueft += 1;
        } else if (kreuz.geprueft || kreuz.urteile.every((urteil) => urteil.bestanden)) {
          eintrag.verificationNote =
            'KI-Erzeugung, einfach geprüft (zweiter Durchlauf desselben Anbieters bestanden).';
          resultat.einfachGeprueft += 1;
        } else {
          resultat.kreuzAbgelehnt += 1;
          continue;
        }
        await studioRequest('/stage', { kind: 'vocabulary', document: { ...eintrag } });
        laufSchluessel.add(schluessel);
        resultat.erzeugt += 1;
      }
      if (resultat.erzeugt > 0) {
        await studioRequest('/publish', {});
        await ladeBestand();
        onFinished();
      }
      setErgebnis(resultat);
      setMeldung(
        `Lauf beendet: ${resultat.erzeugt} erzeugt · ${resultat.kreuzGeprueft} kreuzgeprüft · ${resultat.einfachGeprueft} einfach geprüft · ${resultat.kreuzAbgelehnt} von der Kreuzprüfung abgelehnt · ${resultat.duplikate} Duplikate verworfen · ${resultat.aussortiert} aussortiert.`
      );
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }, [sprache, ziele, paket, thema, stufe, ladeBestand, onFinished]);

  const kostenSchätzung =
    estimateRunCost('situations', 'gemini', 'gemini-2.5-flash', Array.from({ length: Math.min(paket, Math.max(1, fehlt)) }, () => ({ text: '' })));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Wortschatz — Zielgröße je Sprache</ThemedText>

      <View style={styles.zeile}>
        {SPRACHEN.map(({ code, label }) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: sprache === code }}
            onPress={() => setSprache(code)}
            disabled={running}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.pressed,
              sprache === code && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor={sprache === code ? 'text' : 'textSecondary'}>
              {label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.zeile}>
        {ZIEL_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityState={{ selected: ziel === preset }}
            onPress={() => zielSetzen(preset)}
            disabled={running}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.pressed,
              ziel === preset && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor={ziel === preset ? 'text' : 'textSecondary'}>
              {preset.toLocaleString('de-DE')}
            </ThemedText>
          </Pressable>
        ))}
        <TextInput
          value={String(ziel)}
          onChangeText={(text) => {
            const zahl = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (Number.isFinite(zahl) && zahl > 0) zielSetzen(zahl);
          }}
          keyboardType="number-pad"
          accessibilityLabel={`Freies Ziel für ${sprache}`}
          style={[styles.input, styles.kurz, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
      </View>

      <ThemedText type="smallBold">
        {sprache}: {vorhanden.toLocaleString('de-DE')} vorhanden · Ziel {ziel.toLocaleString('de-DE')} ·{' '}
        {fehlt.toLocaleString('de-DE')} fehlt
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {SPRACHEN.map(({ code, label }) => `${label} ${bestand?.[code] ?? '…'}`).join(' · ')}
        {' · '}
        {`Deutsch ${bestand?.de ?? '…'}`}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small">Paketgröße (Wörter je Lauf)</ThemedText>
        <TextInput
          value={paketText}
          onChangeText={(text) => setPaketText(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          accessibilityLabel="Paketgröße"
          style={[styles.input, styles.kurz, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small">Thema (optional)</ThemedText>
        <TextInput
          value={thema}
          onChangeText={setThema}
          accessibilityLabel="Thema des Pakets"
          placeholder="z. B. Im Restaurant"
          placeholderTextColor={theme.textSecondary}
          editable={!running}
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small">Stufe</ThemedText>
        <View style={styles.zeile}>
          {STUFEN.map((stufe_) => (
            <Pressable
              key={stufe_}
              accessibilityRole="button"
              accessibilityState={{ selected: stufe === stufe_ }}
              onPress={() => setStufe(stufe_)}
              disabled={running}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.pressed,
                stufe === stufe_ && { borderColor: theme.accent, borderWidth: 1 },
              ]}>
              <ThemedText type="small" themeColor={stufe === stufe_ ? 'text' : 'textSecondary'}>
                {stufe_}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {phase === 'idle' ? (
        <View style={styles.zeile}>
          <Button label="Fehlende Wörter erzeugen …" onPress={() => setPhase('confirm')} disabled={running || fehlt === 0} />
          <ThemedText type="small" themeColor="textSecondary">
            {fehlt === 0 ? 'Ziel erreicht.' : `${Math.min(paket, fehlt)} Wörter im nächsten Lauf`}
          </ThemedText>
        </View>
      ) : (
        <ThemedView type="backgroundSelected" style={styles.confirmBox}>
          <ThemedText selectable type="small">
            {`Sprache: ${sprache} · Menge: ${Math.min(paket, fehlt)} · Anbieter: gemini · geschätzte Kosten ${
              kostenSchätzung.usd === null ? 'ohne Tarif hinterlegt' : `≈ ${kostenSchätzung.usd.toFixed(4)} $`
            }`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{kostenSchätzung.basis}</ThemedText>
          <View style={styles.zeile}>
            <Button label="Kosten bestätigen und erzeugen" onPress={erzeugen} disabled={running} />
            <Button label="Abbrechen" onPress={() => setPhase('idle')} disabled={running} />
          </View>
        </ThemedView>
      )}

      {ergebnis ? (
        <ThemedText type="smallBold" accessibilityLiveRegion="polite">
          {`Ergebnis: ${ergebnis.erzeugt} erzeugt · ${ergebnis.kreuzGeprueft} kreuzgeprüft · ${ergebnis.einfachGeprueft} einfach geprüft · ${ergebnis.kreuzAbgelehnt} abgelehnt · ${ergebnis.duplikate} Duplikate verworfen · ${ergebnis.aussortiert} aussortiert.`}
        </ThemedText>
      ) : null}

      <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">
        {meldung}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Erzeugte Wörter sind einfach geprüft (Schema + Schrift + Regeln) und
        gekennzeichnet. Die KI-Kreuzprüfung (zweiter Anbieter) hebt sie auf
        „geprüft“ — Brücken-Anker der 20 App-Sprachen ziehen separat nach.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  zeile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Colors.dark.backgroundSelected,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 13,
  },
  kurz: {
    width: 90,
  },
  field: {
    gap: Spacing.one,
  },
  confirmBox: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
