# Leg-los-Liste A–E: Umsetzung und Prüfung

Stand: 20.09.2026. Ausschließlich die oberste Liste aus AGENTS.md bearbeitet; keine bezahlten Anbieteraufrufe.

## Ergebnis

- A: Deutsch-Ziel auf deutscher Oberfläche und im Gesprächspicker entfernt. Alte Richtungen werden auf ein verfügbares Ziel umgeleitet. Thai- und Fremdbrücken behalten Deutsch.
- B: Spanische Silben akzeptieren die vorhandenen Aliasfelder `syllable` und `text`; neue Dokumente verwenden `roman`/`stressed`, ungültige Silben werden abgewiesen. Karten zeigen identische Umschriften und Beispielsätze nicht mehrfach. Alle 20 Schreibknöpfe sind korrigiert. Deutsche Lese-/Produktionsaufgaben verwenden den Quellsprachen-Anker. Antwort-Keys verwenden die Position statt identischer Silbentexte. Große englische Hörgruppen zeigen höchstens vier eindeutige, gemischte Antworten.
- B6: Kuratierte Stammformen für 184 deutsche Verben und Graphemangaben für 173 englische Wörter mechanisch über Stage/Publish ergänzt. Wiederholter Trockenlauf: 0 Änderungen. Scoped Publish lässt andere Entwürfe unverändert und behält das Größenlimit. Thai-Sprechübungen akzeptieren kreuzgeprüfte Einsilber mit Tonangabe, ohne Quellenprüfung zu behaupten. Tonquiz akzeptiert ausschließlich bestandene Tonprüfungen; passende Clips fehlen im aktuellen Bestand noch, der Nutzerlauf bleibt ausstehend.
- C: Generierte Karten zeigen keine Anbieter-/Modellmetadaten und keine permanente Quellenwarnung. Zeitbegründung entfernt. Bestandsformulierungen aktualisiert. Satzübungen unterscheiden nach tatsächlicher Wiedergabe zwischen KI-Clip und Systemstimme.
- D: Neue Wörterbuchtexte in 20 Sprachen, Sprachendonyme in Einstellungen, Tamil-Reparatur, Anführungszeichen, Dialog-Singular, Datumsformat über Locale. Unbekannte/fehlende Systemsprache und Fehlerfall verwenden Englisch; unterstützte Systemsprachen bleiben erhalten.

## Verifikation

- `tsc --noEmit`: erfolgreich; zusätzlich den eingegrenzten Commit-Inhalt separat typgeprüft.
- Vollständige Jest-Suite: 87 Suiten / 1.215 Tests erfolgreich. Anschließende gezielte Prüfung inklusive zusätzlicher Doppel-Key-Regression: 6 Suiten / 30 Tests erfolgreich.
- Pipeline: 12/12 Tests erfolgreich, einschließlich isoliertem Vokabel-Publish. Helper nach Änderung neu gestartet.
- `content:integrity`: 18.705 Einträge, `errors: []`, 259.698.499 Inhaltsbytes. Die ausgewiesenen noch fehlenden Medien sind Abdeckungszahlen, keine Integritätsfehler.
- Vollständiger ESLint-Lauf: 28 Fehler / 53 Warnungen. Die verbleibenden Fehler wurden je Datei mit dem vor Arbeitsbeginn gesicherten Stand verglichen und sind vorbestehend (insbesondere React-Hook-/Compiler-Regeln und Mikrofon-Testumgebung). Keine Unterdrückungsregeln hinzugefügt.
- Browser, Deutsch: nur Thai/Englisch/Spanisch in Übersicht und Gespräch; Kartenbeispiele ohne Doppelung; spanisches Betonungshören beantwortet und ausgewertet; Schreiben zeigt „Prüfen“; englische Hör- und Graphemübungen beantwortet; Thai-Sollkontur gefüllt.
- Browser, Thai: Deutsch samt Prüfungseintrag vorhanden; Karte zeigt Arbeitsplatz und Beispielsatz jeweils einmal; Wort lesen mit Thai-Prompt und deutscher Lösung beantwortet; Sag es mit Thai-Anker; Stammformen beantwortet; Satz-Fußnote lokalisiert, KI-Stimmenhinweis erst nach Clipwiedergabe.
- Browser, Englisch: Sprachbeschreibungen, Tonlegende („no mark“) und Satz-Fußnote lokalisiert. Zusätzlich Tamil-Sprachname und vollständigen Untertitel geprüft. Systemeinstellung am Ende wiederhergestellt.
- Keine Doppel-Key-Warnung oder Absturz in dieser Browser-Runde. Die zuvor berichtete Warnung speziell im englischen Leerzustand ließ sich nicht erneut auslösen; identische Silben als konkrete Key-Kollision sind durch einen UI-Regressionstest abgesichert. Vorbestehende Web-Warnungen zu pointerEvents/expo-file-system bleiben.

## Commit-Grenze

Der Arbeitsstand enthielt vor Beginn viele nicht eingecheckte Änderungen. Commit-Dateien wurden gegen eine Sicherung dieses Ausgangsstands abgegrenzt. Unmittelbar benötigte bestehende Satz-/Katalog-Anbindungen sind als Abhängigkeiten enthalten; andere Generator-, Provider-, Audio- und Tonanalyse-Arbeiten bleiben außerhalb. Der vollständige generierte Katalog und vorhandene Medien werden nicht pauschal eingecheckt. Die 357 lokalen Datenanreicherungen sind über die beiden kuratierten Tabellen und `scripts/content/fill-exercise-data.cjs --write` reproduzierbar; kein KI-Lauf nötig.
