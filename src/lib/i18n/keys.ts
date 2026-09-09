import type de from './dictionaries/de';

/**
 * Der Schlüsselraum: genau die Einträge des deutschen Referenz-Wörterbuchs.
 *
 * `t()` nimmt nur bekannte Schlüssel — ein Tippfehler im Schlüssel ist ein
 * Kompilierfehler, kein leerer Text zur Laufzeit.
 */
export type TranslationKey = keyof typeof de;
