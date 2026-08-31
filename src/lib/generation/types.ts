/**
 * Gemeinsamer Vertrag aller Generierungsläufe (Phase 4: Sprachsituationen,
 * Phase 5: Bilder).
 *
 * Der Bauplan eines Laufs steht **vor** dem ersten Netzwerkaufruf fest und ist
 * deterministisch: dieselben Eingaben ergeben dieselben IDs. Genau das macht
 * einen abgebrochenen Lauf fortsetzbar — beim Neustart wird geprüft, welche
 * IDs schon vorliegen, und nur der Rest angefragt.
 */

/** Das Einzige, was der Batch-Lauf von einem Eintrag wissen muss. */
export type GenerationSpec = {
  id: string;
};

/**
 * Was ein konkreter Lauf beisteuert. Die Regeln zu Robustheit, Fortschritt und
 * Abbruch stehen dagegen einmalig im Batch-Läufer (`batch.ts`) und gelten für
 * jeden Lauf gleich.
 */
export type BatchTask<S extends GenerationSpec> = {
  /**
   * Liegt der Eintrag schon vollständig vor? Was „vollständig" heißt, weiß nur
   * der jeweilige Lauf: bei Sprachsituationen ein Dokument im Speicher, bei
   * Bildern Dokument **und** Bilddatei — ein Dokument ohne Datei wäre eine
   * Karteileiche und muss neu erzeugt werden.
   */
  exists(spec: S): Promise<boolean>;
  /**
   * Erzeugen und vollständig ablegen. Wirft bei jedem Problem; der Läufer
   * zählt das als Fehlschlag und macht weiter.
   */
  produce(spec: S): Promise<void>;
};
