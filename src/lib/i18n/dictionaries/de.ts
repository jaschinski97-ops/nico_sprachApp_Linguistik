/**
 * Deutsches Referenz-Wörterbuch — DIE Quelle für `TranslationKey`.
 *
 * Jeder Schlüssel, den irgendein Screen oder eine Komponente benutzt, steht
 * HIER. Die anderen Sprachen (en, es, fr, th) übersetzen dieses Set; was dort
 * fehlt, fällt in `translate()` auf Deutsch zurück und wird vom
 * Vollständigkeitstest gegen `FALLBACK_ALLOWED_KEYS` gerechnet.
 *
 * Gruppierung nach Screen/Vereinbarung (`tabs.`, `home.`, `review.`, …) —
 * die Punkte im Schlüssel sind Konvention, nicht Verschachtelung.
 */
const de = {
  /* ---------- Gemeinsame Bausteine ---------- */
  'common.retry': 'Erneut versuchen',
  'common.recheck': 'Erneut prüfen',
  'common.loadFailed': 'Konnte nicht geladen werden: {{message}}',
  'common.languageLabel': 'Sprache',
  'common.switchLanguageA11y': 'Sprache wechseln',
  'common.learnGoal': '{{language}} lernen',
  'common.unknownError': 'Unbekannter Fehler.',

  /* ---------- Navigation (app-tabs, beide Plattformen) ---------- */
  'tabs.overview': 'Übersicht',
  'tabs.learn': 'Lernen',
  'tabs.conversation': 'Gespräch',
  'tabs.exam': 'Prüfung',
  'tabs.progress': 'Fortschritt',
  'tabs.settings': 'Einstellungen',
  'tabs.brand': 'Lernbegleiter',
  'tabs.mainNavA11y': 'Hauptnavigation',

  /* ---------- Übersicht (index.tsx) ---------- */
  'home.subtitle': 'Welche Sprache lernst du heute?',
  'home.systemLanguage': 'Systemsprache: {{language}}',
  'home.heroCta': 'Weiter lernen',
  'home.dueBadge': '{{count}} fällig',
  'home.nothingDue': 'Heute nichts fällig',
  'home.sectionLanguages': 'Sprachen',
  'home.vocabCount': '{{count}} Wörter',

  /* ---------- Sprachauswahl (language-picker) ---------- */
  'picker.chooseA11y': 'Sprache wählen',
  'picker.goalDeutschDetail': '{{count}} Wörter von Thai auf Deutsch',
  // Brücken-Lernziel: der „(von X)“-Anteil — die Brücke selbst von einer
  // anderen Sprache gelernt (goals.ts, vonSprache).
  'goal.fromSource': 'von {{language}}',
  'goal.deutschDescription': 'Wörter von Thai auf Deutsch — die deutsche Grammatik (Artikel, Stammformen) wird mitgeübt.',

  /* ---------- Fällig-Badges der Lernziel-Zeilen (language-picker) ---------- */
  'dashboard.cta': '{{direction}} üben',

  /* ---------- Merkhilfen (tone-legend, feature-legend) ---------- */
  'legend.toneTitle': 'Tonfarben',
  'legend.toneBody':
    'Die fünf thailändischen Töne. Bei mehrsilbigen Wörtern hat jede Silbe ihren eigenen Ton — die Farben stehen deshalb an der Umschrift, Silbe für Silbe.',
  'tone.mid': 'Mittel',
  'tone.low': 'Tief',
  'tone.falling': 'Fallend',
  'tone.high': 'Hoch',
  'tone.rising': 'Steigend',
  'legend.stressTitle': 'Betonung',
  'legend.stressBody':
    'Welche Silbe betont wird, steht in der Schreibung — zwei Regeln und eine Ausnahme. Wer sie kennt, muss die Betonung bei keinem neuen Wort nachschlagen.',
  'legend.stressRulePenultimate': 'Endet auf Vokal, „n“ oder „s“',
  'legend.stressRuleFinal': 'Endet auf einen anderen Konsonanten',
  'legend.stressRuleAcute': 'Ein Akut steht geschrieben',
  'legend.stressDetailPenultimate': 'vorletzte Silbe',
  'legend.stressDetailFinal': 'letzte Silbe',
  'legend.stressDetailAcute': 'genau dort — die Regel ist außer Kraft',
  'legend.stressAcuteNote':
    'Ein Akut auf „i“ oder „u“ tut noch etwas anderes: Er trennt zwei Vokale, die sonst eine Silbe wären — „día“ hat deshalb zwei.',
  'legend.spellingTitle': 'Aussprache',
  'legend.spellingBody':
    'Anders als bei Thai und Spanisch gibt es hier keine Regel: Dieselbe Buchstabenfolge klingt von Wort zu Wort anders. Das ist kein Mangel dieser App, sondern der Befund — man muss sie Wort für Wort kennen.',
  'feature.tones': 'Töne',
  'feature.stress': 'Betonung',
  'feature.pronunciation': 'Aussprache',

  /* ---------- Karteikarte (flashcard) ---------- */
  'flashcard.listenA11y': '{{language}} anhören',
  'flashcard.listenGermanA11y': 'Deutsch anhören',
  'flashcard.listenExampleA11y': 'Beispielsatz anhören',
  'flashcard.plural': 'Plural: {{plural}}',

  /* ---------- Lernen (review.tsx) ---------- */
  'review.subtitle': 'Lernrichtung',
  'review.loadingProfile': 'Lade Lernprofil …',
  'review.pickSubtitle': 'Welche Sprache möchtest du üben?',
  'review.switch': '← Sprache oder Richtung wechseln',
  'review.switchA11y': 'Sprache oder Lernrichtung wechseln',
  'mode.cards': 'Karteikarten',
  'mode.speaking': 'Sprechen',
  'mode.writing': 'Schreiben',
  'mode.shadowing': 'Shadowing',
  'mode.sentenceRepeat': 'Satz wiederholen',
  'mode.sentenceListening': 'Satz verstehen',
  'mode.dictation': 'Diktat',
  'drill.tone': 'Töne hören',
  'drill.toneRule': 'Ton herleiten',
  'drill.article': 'Artikel',
  'drill.verbForms': 'Stammformen',
  'drill.stressRule': 'Betonung herleiten',
  'drill.spelling': 'Gleiche Schreibung, anderer Laut',
  'drill.stressHear': 'Betonung hören',
  'drill.soundSpelling': 'Wort hören',
  'skill.wortschatz': 'Wortschatz',
  'skill.hoeren': 'Hören',
  'skill.lesen': 'Lesen',
  'skill.sprechen': 'Sprechen',
  'skill.schreiben': 'Schreiben',
  'skill.grammatik': 'Deutsche Grammatik',
  'cards.loadFailedTitle': 'Sitzung konnte nicht geladen werden',
  'cards.assembleFailed': 'Konnte nicht zusammengestellt werden: {{message}}',
  'cards.assembling': 'Sitzung wird zusammengestellt …',
  'cards.done': 'Sitzung beendet',
  'cards.nothingDue': 'Nichts fällig',
  'cards.summaryRated': '{{rated}} Karten bewertet, davon {{again}}× „Nochmal“.',
  'cards.summaryIdle':
    'In dieser Richtung ist gerade keine Karte fällig. Die Übungen oben gehen trotzdem — sie brauchen keine Fälligkeit.',
  'cards.progress': 'Karte {{index}} von {{total}}',
  'rating.again': 'Nochmal',
  'rating.hard': 'Schwer',
  'rating.good': 'Gut',
  'rating.easy': 'Leicht',
  'rating.a11y': 'Bewertung {{label}}',
  'card.reveal': 'Aufdecken',
  'card.revealA11y': 'Antwort aufdecken',

  /* ---------- Gespräch (conversation.tsx) ---------- */
  'conversation.subtitle': 'Vorproduzierte Sprachsituationen',
  'conversation.loading': 'Lade Situationen …',
  'conversation.subtitleLanguage': 'Vorproduzierte Sprachsituationen · {{language}}',
  'conversation.subtitleCount': '{{count}} Situationen — offline nutzbar',
  'conversation.noneFor': 'Noch keine Situationen für {{language}}',
  'conversation.noneForBody':
    'Diese App-Version enthält noch keine Dialoge für {{language}}. Karteikarten und Übungen findest du unter „Lernen“. Weitere Inhalte kommen mit App-Updates.',
  'conversation.noneForDirection':
    'Diese App-Version enthält noch keine Dialoge für diese Richtung.',
  'conversation.variant': ' · Variante {{count}}',
  'conversation.you': 'Du',
  'conversation.partner': 'Gegenüber',
  'conversation.mistakesTitle': 'Typische Fehler',
  'conversation.aiVoice': 'KI-Stimme',
  'conversation.listenA11y': 'Anhören: {{text}}',
  'conversation.syntheticNote': ' (synthetische Stimme, keine Muttersprachler-Aufnahme)',
  'conversation.topicCount': '{{count}} Dialoge',
  'topic.greeting': 'Begrüßung & Kennenlernen',
  'topic.market': 'Markt & Einkaufen',
  'topic.restaurant': 'Restaurant & Essen',
  'topic.travel': 'Unterwegs',

  /* ---------- Prüfung (exam.tsx) ---------- */
  'exam.subtitle': 'Vorbereitung auf die Goethe-Zertifikate',
  'exam.subtitleModule': 'Modul',
  'exam.moduleLoadFailed': 'Modul konnte nicht geladen werden',
  'exam.partsAsModules': 'Vier Module, die einzeln oder in Kombination abgelegt werden können.',
  'exam.partsTogether': 'Vier Prüfungsteile, die zusammen abgelegt werden.',
  'exam.recommendation':
    'Empfohlen ab {{age}} Jahren; bis zu dieser Stufe rechnet das Goethe-Institut mit {{units}} Unterrichtseinheiten à 45 Minuten.',
  'exam.approxPrefix': 'etwa ',
  'exam.minutes': '{{minutes}} Minuten',
  'exam.formatGroup': ' · Gruppenprüfung',
  'exam.formatPair': ' · Paarprüfung',
  'exam.retrievedPrefix': 'Offizielle Prüfungsstruktur, abgerufen am {{date}} — Quelle: ',
  'exam.retrievedSuffix': '',
  'exam.loading': 'Aufgaben werden geladen …',
  'exam.filterAll': 'Alle',
  'exam.noModules':
    'Für {{level}} liegt hier noch keine Aufgabe. Weitere Aufgaben kommen mit App-Updates dazu.',
  'exam.moduleMinutes': 'etwa {{minutes}} Min',

  /* ---------- Fortschritt (progress.tsx) ---------- */
  'progress.subtitle': 'Lernverlauf',
  'progress.subtitleLanguage': 'Lernverlauf · {{language}}',
  'progress.loading': 'Lade Lernstand …',
  'tile.reviewsToday': 'Heute wiederholt',
  'tile.drillsToday': 'Heute geübt',
  'tile.drillsHint': 'Aufgaben',
  'tile.streak': 'Tage in Folge',
  'tile.dayOne': 'Tag',
  'tile.dayMany': 'Tage',
  'tile.started': 'Begonnen',
  'tile.mastered': 'Gemeistert',
  'chart.perDay': 'Pro Tag',
  'chart.legendReviews': 'Wiederholungen',
  'chart.legendDrills': 'Übungen',
  'chart.columnA11y': '{{date}}: {{reviews}} Wiederholungen, {{drills}} Übungen',
  'chart.loggedSinceWithDrills':
    'Aufgezeichnet seit dem {{since}} — Wiederholungen: {{reviews}} · Übungen: {{drills}} ({{correct}} richtig). Ältere Sitzungen fehlen: das Tagesprotokoll gibt es erst seit dieser Version.',
  'chart.loggedSince':
    'Aufgezeichnet seit dem {{since}} — Wiederholungen: {{reviews}}. Ältere Sitzungen fehlen: das Tagesprotokoll gibt es erst seit dieser Version.',
  'chart.empty':
    'Noch keine Wiederholungen protokolliert. Die Historie beginnt mit der ersten bewerteten Karte; frühere Sitzungen sind nicht enthalten.',
  'state.new': 'Neu',
  'state.learning': 'Am Lernen',
  'state.review': 'Etabliert',
  'state.mastered': 'Gemeistert',
  'states.title': 'Kartenzustände',
  'states.empty':
    'Noch keine Karte bewertet. Sobald du die erste im Reiter „Lernen“ bewertest, steht hier, wie sie sich verteilen.',
  'states.distributionA11y': 'Verteilung der begonnenen Karten: {{parts}}',
  'states.masteredNote': '„Gemeistert“ heißt: die berechnete Stabilität liegt über 21 Tagen.',
  'states.allStarted': 'Alle Karten dieser Sprache sind begonnen.',
  'states.notStarted': 'Noch nicht begonnen: {{count}} von {{total}} Karten.',

  /* ---------- Einstellungen (settings.tsx) ---------- */
  'settings.back': 'Zurück zu Einstellungen',
  'settings.backupTitle': 'Datensicherung',
  'settings.backupSummary': 'Lernfortschritt sichern und wiederherstellen',
  'settings.about': 'Über die App',
  'settings.version': 'Version {{version}}',
  'settings.studio': 'Entwicklerstudio',
  'settings.studioSummary': 'Inhalte, Anbieter und Prüfberichte',
  'settings.local': 'Auf diesem Gerät gespeichert',
  'settings.storageBody': 'Lernfortschritt und Einstellungen liegen auf diesem Gerät. Eine Kopie für den Gerätewechsel ist die Datensicherung in den Einstellungen.',
  'settings.general': 'Allgemein',
  'settings.development': 'Entwicklung',
  'settings.studioDevOnly': 'Das Entwicklerstudio gehört nur zum Entwicklungsbau und ist nicht Teil der installierten App.',
  'settings.studioOrigin': 'Dieses Fenster läuft außerhalb des Studio-Ports. Öffne den Entwicklungsbau auf localhost:8081, um Inhalte zu erzeugen.',
  'settings.materialCount': '{{count}} Wörter · Thai, Englisch und Spanisch',
  'settings.materialBody':
    'Lernmaterial gehört zur App. Neue Wörter, Dialoge und Übungen kommen mit App-Updates. Dein Lernfortschritt bleibt auf diesem Gerät.',
  'settings.warningTitle': 'Lernfortschritt wird nur bis zum Schließen der App gespeichert',
  'settings.warningBody':
    'Der dauerhafte Speicher auf diesem Gerät konnte nicht geöffnet werden. Alles, was du jetzt lernst, ist nach dem Schließen der App verloren. Sichere deinen Fortschritt unten als Datei, solange er noch da ist.',
  'appLanguage.title': 'App-Sprache',
  'appLanguage.body':
    'Die App startet in der Sprache deines Geräts. Hier stellst du sie dauerhaft um.',
  'appLanguage.system': 'System',
  'backup.body':
    'Sichere deinen Lernfortschritt als Datei — etwa vor einem Gerätewechsel oder einer Neuinstallation. Eine solche Sicherung kannst du hier wiederherstellen; sie ersetzt dann die Lernhistorie auf diesem Gerät.',
  'backup.exportA11y': 'Lernhistorie als Datei sichern',
  'backup.importA11y': 'Sicherung einlesen und Lernhistorie ersetzen',
  'backup.exportButton': 'Lernhistorie sichern',
  'backup.exporting': 'Sicherung läuft …',
  'backup.importButton': 'Sicherung wiederherstellen',
  'backup.importing': 'Wird eingelesen …',
  'backup.created': 'Sicherung erstellt: {{fileName}}',
  'backup.failed': 'Das ist schiefgegangen: {{message}}',
  'backup.applied': 'Übernommen: {{parts}}.',
  'backup.fromDate': ' (Sicherung vom {{date}}.)',
  'backup.partsCards': '{{cards}} Karten',
  'backup.partsLog': '{{days}} Tage Lernprotokoll',
  'backup.partsProfile': 'Lernprofil',
  'backup.confirmTitle': 'Lernhistorie ersetzen?',
  'backup.confirmQuestion':
    'Die Sicherung ersetzt deine komplette Lernhistorie auf diesem Gerät. Diesen Schritt gehen?',
  'backup.confirmCancel': 'Abbrechen',
  'backup.confirmReplace': 'Ersetzen',

  /* ---------- Gemeinsame Bausteine der Übungs-Runner ---------- */
  'common.back': 'Zurück',
  'common.next': 'Weiter',

  /* ---------- Übungen (drill-runner; Runden-Strings mehrerer Runner) ---------- */
  'drill.loadFailedTitle': 'Übung konnte nicht geladen werden',
  'drill.assembling': 'Übung wird zusammengestellt …',
  'drill.noVocab': 'Keine passenden Vokabeln',
  'drill.toneEmpty':
    'Für dieses Hörquiz liegen noch keine geprüften Aussprache-Aufnahmen vor. Ungeprüfte Clips und Computerstimmen werden bewusst nicht benutzt — lieber übst du mit einer der anderen Übungen.',
  'drill.noneFor': 'Für „{{drill}}" gibt es im Grundstock gerade keine geeigneten Einträge.',
  'drill.roundDone': 'Runde beendet',
  'drill.roundScore': '{{correct}} von {{total}} richtig.',
  'drill.newRound': 'Neue Runde',
  'drill.questionProgress': 'Aufgabe {{index}} von {{total}}',
  'drill.exit': 'Übung verlassen',
  'drill.playAgain': '🔊 Noch einmal anhören',
  'drill.playAgainA11y': 'Wort noch einmal anhören',
  'drill.voiceMissing': 'Dieses Hörbeispiel ist nicht verfügbar. Du kannst unter „{{skill}}“ weiterüben.',
  'drill.correct': '✓ Richtig',
  'drill.wrong': '✗ Nicht ganz',
  'drill.exact': '✓ Genau richtig',
  'drill.derivationA11y': 'Herleitung des Tons',
  'drill.mistakesTitle': 'Das saß noch nicht:',
  'drill.prompt.tone': 'Welchen Ton hörst du?',
  'drill.prompt.toneRule': 'Welchen Ton hat dieses Wort?',
  'drill.prompt.article': 'Welcher Artikel gehört zum Wort?',
  'drill.prompt.verbForms': 'Wie lautet das Perfekt?',
  'drill.prompt.stressRule': 'Welche Silbe wird betont?',
  'drill.prompt.spelling': 'Wie klingt dieses Schriftstück hier?',
  'drill.prompt.stressHear': 'Welche Silbe hörst du betont?',
  'drill.prompt.soundSpelling': 'Welches Wort hörst du?',

  /* ---------- Prüfungsaufgabe (exam-runner) ---------- */
  'exam.taskMultipleChoice': 'Auswahl (A/B/C)',
  'exam.taskTrueFalse': 'Richtig oder Falsch',
  'exam.taskMatching': 'Zuordnung',
  'exam.taskGapFill': 'Lücken füllen',
  'exam.taskProduction': 'Freie Produktion',
  'exam.backA11y': 'Zurück zur Aufgabenübersicht',
  'exam.back': 'Zurück zur Übersicht',
  'exam.score': '{{correct}} von {{total}} richtig',
  'exam.noPassMark':
    'Das ist eine Übungsaufgabe, keine Prüfung — eine Bestehensgrenze steht hier bewusst nicht, weil sie nicht aus der Quelle erhoben wurde.',
  'exam.check': 'Auswerten',
  'exam.checkDisabled': 'Bitte alle Aufgaben beantworten',
  'exam.listen': 'Text anhören',
  'exam.audioNote':
    'Der Text wird vorgelesen. Sie können ihn beliebig oft anhören; zu lesen ist er erst nach dem Auswerten.',
  'exam.productionNote':
    'Diese Aufgabe wird nicht automatisch bewertet — freie Texte und gesprochene Antworten kann die App nicht zuverlässig beurteilen. Schreiben oder sprechen Sie erst selbst, vergleichen Sie dann mit der Musterlösung.',
  'exam.modelAnswerTitle': 'Musterlösung',
  'exam.listenModel': 'Musterlösung anhören',
  'exam.selfCheck': 'Selbstkontrolle',
  'exam.showModel': 'Musterlösung zeigen',

  /* ---------- Freies Schreiben (writing-runner) ---------- */
  'writing.promptDe': 'Wie heißt das auf Deutsch? Mit Artikel, falls es einen gibt.',
  'writing.promptTh': 'Wie schreibt man das auf Thai? Mit Tonzeichen.',
  'writing.promptEs': 'Wie schreibt man das auf Spanisch? Mit Akzentzeichen.',
  'writing.promptEn': 'Wie schreibt man das auf Englisch?',
  'writing.assembling': 'Runde wird zusammengestellt …',
  'writing.noneForDirection': 'Für diese Richtung gibt es noch keine Vokabel mit tippbarer Zielform.',
  'writing.summary': '{{correct}} von {{total}} richtig, davon {{exact}} ohne Tippfehler.',
  'writing.countsAsReview':
    'Diese Runde zählt als Wiederholung: Anders als die Auswahlübungen schreibt das freie Schreiben den Kartenzustand fort (AE-40).',
  'writing.inputA11y': 'Antwort eingeben',
  'writing.checkA11y': 'Antwort prüfen',
  'writing.check': 'Aufgabe {{index}} von {{total}}',
  'writing.taskOf': 'Aufgabe {{index}} von {{total}}',

  /* ---------- Bewertungshinweis (writing-runner, dictation-runner) ---------- */
  'rating.ratedAs': 'Bewertet als „{{rating}}". {{explanation}}',

  /* ---------- Sprechübung (speaking-runner) ---------- */
  'speaking.noticeClip': 'KI-Clip abgespielt — nur Hörbeispiel, nie Bewertungsmaßstab.',
  'speaking.noticeTts': 'Gerätestimme abgespielt — nur Hörbeispiel, nie Bewertungsmaßstab.',
  'speaking.noticeNone': 'Auf diesem Gerät ist kein Hörbeispiel verfügbar.',
  'speaking.noticeError':
    'Das Hörbeispiel konnte nicht abgespielt werden. Die Aufnahme funktioniert davon unabhängig.',
  'speaking.loadFailedTitle': 'Sprechübung konnte nicht geladen werden',
  'speaking.assembling': 'Sprechübung wird zusammengestellt …',
  'speaking.noTarget': 'Keine passende Sollkontur',
  'speaking.noTargetBody':
    'Die Übung nimmt nur vollständig quellengeprüfte, einsilbige Thai-Wörter. So wird keine Silbengrenze geraten.',
  'speaking.roundSummaryOne':
    '{{count}} Tonkontur lokal ausgewertet. Es gibt bewusst keine Punktzahl: Gemessen wurde nicht die vollständige Aussprache.',
  'speaking.roundSummaryMany':
    '{{count}} Tonkonturen lokal ausgewertet. Es gibt bewusst keine Punktzahl: Gemessen wurde nicht die vollständige Aussprache.',
  'speaking.progress': 'Wort {{index}} von {{total}}',
  'speaking.exitA11y': 'Sprechübung verlassen',
  'speaking.sayThisWord': 'Sprich dieses Wort',
  'speaking.playExample': 'Synthetisches Hörbeispiel',
  'speaking.clipNote':
    'Der Clip hilft nur beim Anhören. Die Bewertung vergleicht deine Aufnahme nicht mit dieser Stimme.',
  'speaking.privacyTitle': 'Mikrofon und Datenschutz',
  'speaking.scopedNote':
    'Bewertet wird nur die Tonhöhenkontur — nicht Konsonanten, Vokallänge, Aspiration oder die vollständige Aussprache; deshalb gibt es keine Punktzahl.',
  'speaking.permissionNote':
    'Falls die Freigabe noch fehlt, erscheint die Systemabfrage erst, wenn du „{{action}}“ wählst. Nach spätestens vier Sekunden stoppt die Aufnahme automatisch.',
  'speaking.stop': 'Stoppen und lokal auswerten',
  'speaking.requestingPermission': 'Mikrofonfreigabe wird angefragt …',
  'speaking.evaluating': 'Wird lokal ausgewertet …',
  'speaking.start': 'Aufnahme starten',
  'speaking.discard': 'Verwerfen',
  'speaking.recording': '● Aufnahme läuft · {{seconds}} s',
  'speaking.retry': 'Noch einmal aufnehmen',
  'speaking.nextWord': 'Nächstes Wort',
  'speaking.noFsrs': 'Diese Teilmessung verändert deinen FSRS-Karteikasten nicht.',
  'speaking.targetForm': 'Sollform: {{tone}}',
  'speaking.source':
    'Quelle: quellengeprüfter Silbenton aus Wiktionary-IPA{{link}}. Nicht aus TTS oder einem Hörclip.',
  'speaking.sourceLink': ' · Quellenlink im Vokabeleintrag',
  'speaking.verdictCompatible': 'Kontur vereinbar',
  'speaking.verdictNeedsWork': 'Kontur noch nicht vereinbar',
  'speaking.verdictRegister': 'Kontur gemessen – Register offen',
  'speaking.verdictUnreliable': 'Nicht zuverlässig messbar',
  'speaking.curveNote':
    'Messkurve: relative Halbtöne; die gestrichelte Linie ist der Median dieser Aufnahme.',
  'speaking.measuredLine':
    'Bewertete stimmhafte Strecke: {{duration}} ms · Aufnahme: {{seconds}} s{{limit}}',
  'speaking.autoStopped': ' · automatisch gestoppt',
  'speaking.limitationsTitle': 'Was diese Rückmeldung nicht bewertet',

  /* ---------- Diktat (dictation-runner) ---------- */
  'dictation.promptTh': 'Schreib den Satz auf, den du hörst — mit Tonzeichen.',
  'dictation.promptDe': 'Schreib den Satz auf, den du hörst — mit Groß- und Kleinschreibung.',
  'dictation.promptEs': 'Schreib den Satz auf, den du hörst — mit Akzentzeichen.',
  'dictation.promptEn': 'Write down the sentence you hear.',
  'dictation.noVoice':
    'Kein Satzclip und keine {{language}}-Systemstimme verfügbar. Installiere eine {{language}}-Stimme oder nutze ein Gerät mit {{language}}-Sprachausgabe.',
  'dictation.slowClipOnly':
    'Verlangsamt geht nur ein hinterlegter Satzclip — die Systemstimme spielt normal schnell.',
  'dictation.slowUnsupported':
    'Verlangsamen wird auf diesem Gerät nicht unterstützt — normale Geschwindigkeit.',
  'dictation.noneFor': 'Noch kein Diktatstoff für {{language}}',
  'dictation.summary': '{{correct}} von {{total}} bestanden, davon {{exact}} fehlerfrei.',
  'dictation.onlyPassedRate':
    'Nur bestandene Diktate haben den Wiederholungsplan der zugehörigen Vokabel fortgeschrieben.',
  'dictation.newRoundA11y': 'Neue Diktatrunde',
  'dictation.progress': 'Diktat {{index}} von {{total}}',
  'dictation.exit': 'Diktat verlassen',
  'dictation.play': 'Satz hören',
  'dictation.playSlowA11y': 'Satz verlangsamt hören',
  'dictation.slow': 'Langsam',
  'dictation.relistenNote': 'Mehrfaches Hören ist ausdrücklich erlaubt — auch nach „{{action}}“.',
  'dictation.inputA11y': 'Diktat eingeben',
  'dictation.check': 'Prüfen',
  'dictation.checkA11y': 'Diktat prüfen',
  'dictation.passed': '✓ Bestanden',
  'dictation.failed': '✗ Noch nicht bestanden',
  'dictation.baseScore': 'Basisschrift {{base}} %{{tonePart}}',
  'dictation.toneScorePart': ' · Ton-/Diakritikazeichen {{score}} %',
  'dictation.tooMuch': 'Zu viel getippt: {{tokens}}',
  'dictation.notRated':
    'Nicht bestanden — der Wiederholungsplan der Vokabel bleibt unverändert. Nur bestandene Diktate zählen als Wiederholung.',

  /* ---------- Satzübungen (sentence-runner) ---------- */
  'sentence.interrupted': 'Unterbrochen. Die Aufnahme wurde verworfen; bereite den Satz erneut vor.',
  'sentence.noVoice':
    'Kein Satzclip und keine {{language}}-Systemstimme verfügbar. Installiere eine {{language}}-Stimme oder nutze ein Gerät mit {{language}}-Sprachausgabe. Ohne hörbaren Satz wird keine Antwort bewertet.',
  'sentence.playFailed': 'Die Satzwiedergabe ist fehlgeschlagen. Versuche es erneut.',
  'sentence.measureFailed': 'Die Aufnahme konnte nicht ausgewertet werden.',
  'sentence.modelFailed': 'Das Vorbild konnte nicht starten. Die Aufnahme wurde verworfen.',
  'sentence.noneFor': 'Noch kein Satzmaterial für {{language}}',
  'sentence.listeningSummary': '{{correct}} von {{total}} Satzbedeutungen richtig gewählt.',
  'sentence.spokenSummary':
    '{{total}} Sätze bearbeitet. Keine Aussprachebewertung und keine Änderung am Wiederholungsplan.',
  'sentence.progress': 'Satz {{index}} von {{total}}',
  'sentence.exit': 'Satzübung verlassen',
  'sentence.titleShadowing': 'Mit dem Satz mitsprechen',
  'sentence.titleRepeat': 'Denselben Satz wiederholen',
  'sentence.roundHint': 'Runde {{round}} von 3 · 12 / 9 / 6 Sekunden.',
  'sentence.hintA11y': 'Hintergrund zur Übungsform',
  'sentence.hintShow': '▼ Hintergrund anzeigen',
  'sentence.hintHide': '▲ Hintergrund ausblenden',
  'sentence.hintRepeat':
    'Anpassung des 4:3:2-Verhältnisses an kurze Sätze, kein 4/3/2-Minuten-Vortrag. Der Effekt wechselnder Zuhörer und echter Mitteilungsabsicht wird hier nicht abgedeckt.',
  'sentence.hintShadowing':
    'Höre den Satz zuerst. Sprich danach während des Vorbilds mit. Nutze Kopfhörer: Über Lautsprecher kann das Vorbild in deiner Mikrofonmessung landen.',
  'sentence.prepare': 'Verpflichtende Vorbereitung · noch {{seconds}} Sekunden',
  'sentence.prepareBody':
    'Kläre die Bedeutung und plane den ganzen Satz. {{focus}} Die 15 Sekunden sind eine Übungsentscheidung, kein wissenschaftlich ermitteltes Optimum.',
  'sentence.listen': 'Satz hören',
  'sentence.listenAgain': 'Satz erneut hören',
  'sentence.exampleNote': 'Das Hörbeispiel ist kein Bewertungsmaßstab für deine Aufnahme.',
  'sentence.headphones': 'Ich verwende Kopfhörer',
  'sentence.headphonesOk': 'Kopfhörer bestätigt',
  'sentence.micNote':
    'Mikrofon erst nach „{{action}}“. Nur flüchtiger Gerätespeicher, kein Upload. Höchstens {{seconds}} Sekunden; danach wird die Aufnahme ausgewertet und verworfen.',
  'sentence.start': 'Aufnahme starten',
  'sentence.remaining': 'Noch {{seconds}} Sekunden',
  'sentence.stop': 'Aufnahme beenden',
  'sentence.measurement': 'Lokale Messung · {{seconds}} Sekunden Aufnahme',
  'sentence.voicedNote':
    '{{percent}} % der Analysefenster haben messbare Periodizität. Das ist keine Sprechzeit-, Tempo- oder Flüssigkeitsnote.',
  'sentence.limitReached':
    'Das Zeitfenster ist abgelaufen; ob der Satz vollständig war, wird nicht erkannt.',
  'sentence.contourNote':
    'Nur längster zusammenhängender F0-Abschnitt, {{duration}} ms. Kein Sollvergleich für den Satz; Worttöne, Konsonanten, Vokallänge, Aspiration und Vollständigkeit sind nicht bewertet.',
  'sentence.noVoiced':
    'Keine ausreichende stimmhafte Strecke messbar. Das bedeutet nicht, dass dein Satz falsch war.',
  'sentence.reprepare': 'Noch einmal vorbereiten',
  'sentence.nextWindow': 'Nächstes Zeitfenster vorbereiten',
  'sentence.nextSentence': 'Nächster Satz',
  'sentence.questionPrompt': 'Welche ganze Aussage oder Frage hast du gehört?',
  'sentence.correct': 'Richtig.',
  'sentence.meant': 'Gemeint ist: {{answer}}',

  /* ---------- Diagnose (diagnostics-card) ---------- */
  'diagnostics.title': 'Diagnose',
  'diagnostics.body':
    'Was im Speicher liegt und worauf es liegt. Für das Lernen ohne Bedeutung — nützlich, wenn etwas nicht so aussieht wie erwartet.',
  'diagnostics.tableA11y': 'Vokabeln je Sprache',
  'diagnostics.row': '{{stored}} im Speicher · {{shipped}} ausgeliefert · {{verified}} quellengeprüft',
  'diagnostics.backends': 'Datenspeicher: {{data}} · Bildablage: {{images}} · Clipablage: {{clips}}',
  'diagnostics.loading': 'Lade …',

} as const;

export default de;