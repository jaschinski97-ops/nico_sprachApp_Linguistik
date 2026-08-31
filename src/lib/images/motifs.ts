/**
 * Das Bildmotiv je konkreter Vokabel — auf Englisch.
 *
 * WARUM EINE EIGENE LISTE UND NICHT EINFACH `entry.german`:
 *
 * 1. **Sprache.** Bildmodelle sind praktisch ausschließlich auf englischen
 *    Bildunterschriften trainiert. „das Huhn" als Prompt ist ein Glücksspiel,
 *    „a live chicken standing" nicht.
 * 2. **Eindeutigkeit.** Genau hier entscheidet sich, ob ein Bild eine Merkhilfe
 *    oder eine falsche Fährte wird. ไก่ heißt das *Tier* Huhn — ein Teller
 *    Brathähnchen wäre gemerkt als „Hühnerfleisch". ปลา ist der Fisch im
 *    Wasser, nicht das Fischfilet. ร้าน ist laut Quelle „Stand, Bude" (der
 *    Eintrag trägt deshalb `sourceVerified: false`), also ein Straßenstand und
 *    kein Ladengeschäft. Solche Entscheidungen gehören ausformuliert und
 *    nachlesbar, nicht in einen Prompt hineingeraten.
 *
 * WARUM NICHT IM VOKABEL-GRUNDSTOCK: Der Grundstock ist die geprüfte Grundlage
 * und wird von den Generatoren nicht erweitert oder verändert — so steht es im
 * Skalierungsplan. Die Motive sind Beiwerk des Bildgenerators und liegen
 * deshalb hier. Ein Test hält die beiden Seiten zusammen: jede konkrete
 * Vokabel braucht ein Motiv, und ein Motiv ohne passende Vokabel fliegt auf.
 */

export const IMAGE_MOTIFS: Record<string, string> = {
  nam: 'a single clear glass of drinking water on a plain surface',
  khaao: 'a bowl of steamed white rice',
  aahaan: 'a plate of simple Thai food, rice with vegetables',
  baan: 'a small simple house with a roof and a door',
  rot: 'a single small car seen from the side',
  talaat: 'an open air market stall with fruit and vegetables',
  rongrian: 'a school building with a flag pole in front',
  // Die Quelle belegt "Stand, Bude" - deshalb ein Strassenstand, kein Ladengeschaeft.
  raan: 'a small Thai street food stall with an awning',
  khon: 'a single friendly person standing, full figure',
  phuean: 'two friends standing side by side, smiling',
  khruu: 'a teacher standing in front of a blackboard',
  moo_doctor: 'a doctor in a white coat with a stethoscope',
  maew: 'a single cat sitting',
  maa_dog: 'a single dog sitting',
  maa_horse: 'a single horse standing on grass',
  // Das Tier, nicht das Gericht - sonst merkt sich der Kopf "Haehnchenfleisch".
  gai: 'a live chicken standing on the ground',
  khai: 'two white chicken eggs',
  // Der Fisch im Wasser, nicht das Filet auf dem Teller.
  bplaa: 'a single fish swimming in clear water',
  muu: 'a single pig standing on a farm',
  phak: 'a pile of fresh green vegetables',
  phonlamai: 'a pile of tropical fruit, mango banana and pineapple',
  kaafae: 'a cup of hot black coffee on a saucer',
  chaa: 'a cup of hot tea with a tea leaf beside it',
  ngoen: 'Thai banknotes and coins lying on a table',
  nangsue: 'a single closed book lying flat',
};

export function hasMotif(vocabId: string): boolean {
  return Object.prototype.hasOwnProperty.call(IMAGE_MOTIFS, vocabId);
}

/**
 * Das Motiv zu einer Vokabel — wirft, wenn keines hinterlegt ist.
 *
 * Absichtlich kein Rückfall auf das deutsche Wort: ein deutscher Prompt an ein
 * englisch trainiertes Modell liefert irgendein Bild, und irgendein Bild ist
 * schlechter als gar keins. Lieber ein sichtbarer Fehlschlag, der auf die
 * fehlende Zeile hier zeigt.
 */
export function motifFor(vocabId: string): string {
  const motif = IMAGE_MOTIFS[vocabId];
  if (!motif) {
    throw new Error(
      `Für "${vocabId}" ist kein Bildmotiv hinterlegt (src/lib/images/motifs.ts).`
    );
  }
  return motif;
}
