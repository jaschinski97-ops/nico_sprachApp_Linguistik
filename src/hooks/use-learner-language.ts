import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_LANGUAGE } from '@/lib/languages/registry';
import { LanguageCode } from '@/lib/languages/types';
import { LearnerProfile, loadProfile, setLanguage } from '@/lib/profile';

/**
 * Die gerade gelernte Sprache — gelesen aus dem Profil, umschaltbar von jedem
 * Bereich aus (Phase 17, Ziel 4).
 *
 * Reine Anzeigehilfe: Sie kapselt nur `loadProfile` und `setLanguage`, damit
 * nicht fünf Screens dieselben drei Zeilen wiederholen. Die Entscheidung, was
 * ein Sprachwechsel mit der Standard-Lernrichtung macht, bleibt in
 * `lib/profile` (Phase 15) und wird hier nicht angefasst.
 *
 * Bis das Profil gelesen ist, gilt die Vorgabesprache — sichtbar wird das
 * praktisch nie, weil der Speicher lokal ist.
 */
export function useLearnerLanguage(): {
  language: LanguageCode;
  profile: LearnerProfile | null;
  chooseLanguage: (language: LanguageCode) => Promise<void>;
} {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((loaded) => {
      if (!cancelled) setProfile(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseLanguage = useCallback(async (language: LanguageCode) => {
    setProfile(await setLanguage(language));
  }, []);

  return { language: profile?.language ?? DEFAULT_LANGUAGE, profile, chooseLanguage };
}
