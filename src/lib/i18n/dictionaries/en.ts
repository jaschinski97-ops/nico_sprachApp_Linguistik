import type { TranslationKey } from '../keys';

/**
 * English — complete translation of the German reference set.
 * Missing keys fall back to German at lookup time and are reported by the
 * completeness test.
 */
const en: Partial<Record<TranslationKey, string>> = {
  'common.retry': 'Try again',
  'common.recheck': 'Check again',
  'common.loadFailed': 'Could not be loaded: {{message}}',
  'common.languageLabel': 'Language',
  'common.switchLanguageA11y': 'Switch language',
  'common.learnGoal': 'Learn {{language}}',
  'common.unknownError': 'Unknown error.',

  'tabs.overview': 'Overview',
  'tabs.learn': 'Learn',
  'tabs.conversation': 'Conversation',
  'tabs.exam': 'Exam',
  'tabs.progress': 'Progress',
  'tabs.settings': 'Settings',
  'tabs.brand': 'Learning companion',
  'tabs.mainNavA11y': 'Main navigation',

  'home.subtitle': 'Which language are you learning today?',
  'home.systemLanguage': 'System language: {{language}}',
  'home.heroCta': 'Continue learning',
  'home.dueBadge': '{{count}} due',
  'home.nothingDue': 'Nothing due today',
  'home.sectionLanguages': 'Languages',
  'home.vocabCount': '{{count}} words',

  'picker.chooseA11y': 'Choose language',
  'picker.goalDeutschDetail': '{{count}} words, from Thai into German',

  'dashboard.cta': 'Practise {{direction}}',

  'legend.toneTitle': 'Tone colours',
  'legend.toneBody':
    'The five Thai tones. In polysyllabic words every syllable carries its own tone — that is why the colours sit on the transliteration, syllable by syllable.',
  'tone.mid': 'Mid',
  'tone.low': 'Low',
  'tone.falling': 'Falling',
  'tone.high': 'High',
  'tone.rising': 'Rising',
  'legend.stressTitle': 'Stress',
  'legend.stressBody':
    'Which syllable is stressed is written down — two rules and one exception. Once you know them, you never have to look up stress for a new word.',
  'legend.stressRulePenultimate': 'Ends in a vowel, “n” or “s”',
  'legend.stressRuleFinal': 'Ends in another consonant',
  'legend.stressRuleAcute': 'An acute accent is written',
  'legend.stressDetailPenultimate': 'penultimate syllable',
  'legend.stressDetailFinal': 'final syllable',
  'legend.stressDetailAcute': 'exactly there — the rule is suspended',
  'legend.stressAcuteNote':
    'An acute accent on “í” or “ú” does something else as well: it splits two vowels that would otherwise form one syllable — “día” therefore has two.',
  'legend.spellingTitle': 'Pronunciation',
  'legend.spellingBody':
    'Unlike Thai and Spanish there is no rule here: the same letter sequence sounds different from word to word. That is not a flaw of this app but the finding — you have to know it word by word.',
  'feature.tones': 'Tones',
  'feature.stress': 'Stress',
  'feature.pronunciation': 'Pronunciation',
  'feature.gender': 'Gender',

  'flashcard.listenA11y': 'Listen to {{language}}',
  'flashcard.listenGermanA11y': 'Listen to German',
  'flashcard.listenExampleA11y': 'Listen to example sentence',
  'flashcard.plural': 'Plural: {{plural}}',

  'review.subtitle': 'Learning direction',
  'review.loadingProfile': 'Loading learning profile …',
  'review.pickSubtitle': 'Which language would you like to practise?',
  'review.switch': '← Switch language or direction',
  'review.switchA11y': 'Switch language or learning direction',
  'mode.cards': 'Flashcards',
  'mode.speaking': 'Speaking',
  'mode.writing': 'Writing',
  'mode.shadowing': 'Shadowing',
  'mode.sentenceRepeat': 'Repeat sentence',
  'mode.sentenceListening': 'Understand sentence',
  'mode.dictation': 'Dictation',
  'drill.tone': 'Hear tones',
  'drill.toneRule': 'Derive tone',
  'drill.article': 'Articles',
  'drill.verbForms': 'Verb forms',
  'drill.stressRule': 'Derive stress',
  'drill.spelling': 'Same spelling, other sound',
  'drill.stressHear': 'Hear stress',
  'drill.soundSpelling': 'Hear the word',
  'skill.wortschatz': 'Vocabulary',
  'skill.hoeren': 'Listening',
  'skill.lesen': 'Reading',
  'skill.sprechen': 'Speaking',
  'skill.schreiben': 'Writing',
  'skill.grammatik': 'German grammar',
  'cards.loadFailedTitle': 'Session could not be loaded',
  'cards.assembleFailed': 'Could not be assembled: {{message}}',
  'cards.assembling': 'Assembling session …',
  'cards.done': 'Session finished',
  'cards.nothingDue': 'Nothing due',
  'cards.summaryRated': '{{rated}} cards rated, {{again}} of them “Again”.',
  'cards.summaryIdle':
    'No card is currently due in this direction. The exercises above still work — they do not require anything to be due.',
  'cards.progress': 'Card {{index}} of {{total}}',
  'rating.again': 'Again',
  'rating.hard': 'Hard',
  'rating.good': 'Good',
  'rating.easy': 'Easy',
  'rating.a11y': 'Rating {{label}}',
  'card.reveal': 'Reveal',
  'card.revealA11y': 'Reveal answer',

  'conversation.subtitle': 'Pre-produced language situations',
  'conversation.loading': 'Loading situations …',
  'conversation.subtitleLanguage': 'Pre-produced language situations · {{language}}',
  'conversation.subtitleCount': '{{count}} situations — usable offline',
  'conversation.noneFor': 'No situations yet for {{language}}',
  'conversation.noneForBody':
    'This app version does not yet contain dialogs for {{language}}. You can find flashcards and exercises under “Learn”. More content arrives with app updates.',
  'conversation.noneForDirection':
    'This app version does not yet contain dialogs for this direction.',
  'conversation.variant': ' · Variant {{count}}',
  'conversation.you': 'You',
  'conversation.partner': 'Partner',
  'conversation.mistakesTitle': 'Typical mistakes',
  'conversation.aiVoice': 'AI voice',
  'conversation.listenA11y': 'Listen: {{text}}',
  'conversation.syntheticNote': ' (synthetic voice, no native-speaker recording)',
  'conversation.topicCount': '{{count}} dialogues',
  'topic.greeting': 'Greetings & getting acquainted',
  'topic.market': 'Market & shopping',
  'topic.restaurant': 'Restaurant & food',
  'topic.travel': 'On the move',

  'exam.subtitle': 'Preparation for the Goethe certificates',
  'exam.subtitleModule': 'Module',
  'exam.moduleLoadFailed': 'Module could not be loaded',
  'exam.partsAsModules': 'Four modules that can be taken individually or in combination.',
  'exam.partsTogether': 'Four exam parts that are taken together.',
  'exam.recommendation':
    'Recommended from age {{age}}; up to this level the Goethe-Institut expects {{units}} teaching units of 45 minutes each.',
  'exam.approxPrefix': 'about ',
  'exam.minutes': '{{minutes}} minutes',
  'exam.formatGroup': ' · Group exam',
  'exam.formatPair': ' · Pair exam',
  'exam.retrievedPrefix': 'Official exam structure, retrieved on {{date}} — source: ',
  'exam.retrievedSuffix': '',
  'exam.loading': 'Loading tasks …',
  'exam.filterAll': 'All',
  'exam.noModules':
    'No task available yet for {{level}}. More tasks arrive with app updates.',
  'exam.moduleMinutes': 'about {{minutes}} min',
  'exam.aboutTitle': 'What this is — and what it is not',
  'exam.aboutBody':
    'The structure above comes from the Goethe-Institut. The tasks, by contrast, were written by us; they are neither original tasks nor model sets of the Goethe-Institut. Authentic model sets and practice materials are available from the Goethe-Institut itself.',
  'exam.aboutGermanOnly':
    'The Goethe-Institut certifies German. This module is therefore aimed at everyone who learns German — whether their language is Thai, English or Spanish. For the reverse direction (German → Thai) there is a small A1 start modelled on the Goethe format — practice, not an official exam.',

  'progress.subtitle': 'Learning history',
  'progress.subtitleLanguage': 'Learning history · {{language}}',
  'progress.loading': 'Loading learning status …',
  'tile.reviewsToday': 'Reviewed today',
  'tile.drillsToday': 'Practised today',
  'tile.drillsHint': 'Exercises',
  'tile.streak': 'Days in a row',
  'tile.dayOne': 'day',
  'tile.dayMany': 'days',
  'tile.started': 'Started',
  'tile.mastered': 'Mastered',
  'chart.perDay': 'Per day',
  'chart.legendReviews': 'Reviews',
  'chart.legendDrills': 'Exercises',
  'chart.columnA11y': '{{date}}: {{reviews}} reviews, {{drills}} exercises',
  'chart.loggedSinceWithDrills':
    'Recorded since {{since}} — reviews: {{reviews}} · exercises: {{drills}} ({{correct}} correct). Earlier sessions are missing: the daily log only exists since this version.',
  'chart.loggedSince':
    'Recorded since {{since}} — reviews: {{reviews}}. Earlier sessions are missing: the daily log only exists since this version.',
  'chart.empty':
    'No reviews logged yet. The history begins with the first rated card; earlier sessions are not included.',
  'state.new': 'New',
  'state.learning': 'Learning',
  'state.review': 'Established',
  'state.mastered': 'Mastered',
  'states.title': 'Card states',
  'states.empty':
    'No card rated yet. As soon as you rate the first one in the “Learn” tab, its distribution appears here.',
  'states.distributionA11y': 'Distribution of the started cards: {{parts}}',
  'states.masteredNote':
    '“Mastered” means: the computed stability lies above 21 days.',
  'states.allStarted': 'All cards of this language have been started.',
  'states.notStarted': 'Not yet started: {{count}} of {{total}} cards.',

  'settings.back': 'Back to settings',
  'settings.backupTitle': 'Backup',
  'settings.backupSummary': 'Save and restore your progress',
  'settings.about': 'About the app',
  'settings.version': 'Version {{version}}',
  'settings.studio': 'Developer studio',
  'settings.studioSummary': 'Content, providers and reports',
  'settings.local': 'Stored on this device',
  'settings.storageBody': 'Learning progress and settings live on this device. The backup in the settings is a copy for moving to a new device.',
  'settings.general': 'General',
  'settings.development': 'Development',
  'settings.studioDevOnly': 'The developer studio belongs to the development build only — it is not part of the installed app.',
  'settings.studioOrigin': 'This window is running outside the studio port. Open the development build on localhost:8081 to generate content.',
  'settings.materialTitle': 'Your learning material',
  'settings.materialCount': '{{count}} words · Thai, English and Spanish',
  'settings.materialBody':
    'Learning material belongs to the app. New words, dialogs and exercises arrive with app updates. Your learning progress stays on this device.',
  'settings.warningTitle': 'Progress is only saved until the app is closed',
  'settings.warningBody':
    'The permanent storage on this device could not be opened. Everything you learn now will be lost when the app closes. Save your progress below as a file while it is still there.',
  'appLanguage.title': 'App language',
  'appLanguage.body':
    'The app starts in your device’s language. Here you can set it permanently.',
  'appLanguage.system': 'System',
  'backup.body':
    'Save your learning progress as a file — for example before switching devices or reinstalling. You can restore such a backup here; it then replaces the learning history on this device.',
  'backup.exportA11y': 'Save learning history as a file',
  'backup.importA11y': 'Read backup and replace learning history',
  'backup.exportButton': 'Save learning history',
  'backup.exporting': 'Saving backup …',
  'backup.importButton': 'Restore backup',
  'backup.importing': 'Reading backup …',
  'backup.created': 'Backup created: {{fileName}}',
  'backup.failed': 'This is what went wrong: {{message}}',
  'backup.applied': 'Imported: {{parts}}.',
  'backup.fromDate': ' (backup from {{date}}.)',
  'backup.partsCards': '{{cards}} cards',
  'backup.partsLog': '{{days}} days of learning log',
  'backup.partsProfile': 'Learning profile',
  'backup.confirmTitle': 'Replace learning history?',
  'backup.confirmQuestion':
    'The backup will replace your entire learning history on this device. Take this step?',
  'backup.confirmCancel': 'Cancel',
  'backup.confirmReplace': 'Replace',

  /* ---------- Shared pieces of the exercise runners ---------- */
  'common.back': 'Back',
  'common.next': 'Next',
  'common.cancel': 'Cancel',
  'common.failed': 'That failed: {{message}}',

  /* ---------- Exercises (drill-runner; round strings shared by runners) ---------- */
  'drill.loadFailedTitle': 'Exercise could not be loaded',
  'drill.assembling': 'Preparing the exercise …',
  'drill.noVocab': 'No matching vocabulary',
  'drill.toneEmpty':
    'This listening quiz has no verified pronunciation recordings yet. Unverified clips and computer voices are deliberately not used — better practise with one of the other exercises.',
  'drill.noneFor': 'There are currently no suitable entries for “{{drill}}” in the base set.',
  'drill.roundDone': 'Round finished',
  'drill.roundScore': '{{correct}} of {{total}} correct.',
  'drill.newRound': 'New round',
  'drill.questionProgress': 'Task {{index}} of {{total}}',
  'drill.exit': 'Leave exercise',
  'drill.playAgain': '🔊 Listen again',
  'drill.playAgainA11y': 'Listen to the word again',
  'drill.voiceMissing': 'This listening example is not available. You can keep practising under “{{skill}}”.',
  'drill.correct': '✓ Correct',
  'drill.wrong': '✗ Not quite',
  'drill.exact': '✓ Exactly right',
  'drill.derivationA11y': 'Derivation of the tone',
  'drill.mistakesTitle': 'Not quite there yet:',
  'drill.prompt.tone': 'Which tone do you hear?',
  'drill.prompt.toneRule': 'Which tone does this word have?',
  'drill.prompt.article': 'Which article belongs to the word?',
  'drill.prompt.verbForms': 'What is the perfect form?',
  'drill.prompt.stressRule': 'Which syllable is stressed?',
  'drill.prompt.spelling': 'How does this spelling sound here?',
  'drill.prompt.stressHear': 'Which syllable do you hear as stressed?',
  'drill.prompt.soundSpelling': 'Which word do you hear?',

  /* ---------- Exam task (exam-runner) ---------- */
  'exam.taskMultipleChoice': 'Multiple choice (A/B/C)',
  'exam.taskTrueFalse': 'True or false',
  'exam.taskMatching': 'Matching',
  'exam.taskGapFill': 'Gap fill',
  'exam.taskProduction': 'Free production',
  'exam.backA11y': 'Back to the task overview',
  'exam.back': 'Back to the overview',
  'exam.score': '{{correct}} of {{total}} correct',
  'exam.noPassMark':
    'This is a practice task, not an exam — no pass mark is given here, deliberately, because it was not taken from the source.',
  'exam.check': 'Evaluate',
  'exam.checkDisabled': 'Please answer all tasks',
  'exam.listen': 'Listen to the text',
  'exam.audioNote':
    'The text is read aloud. You can listen to it as often as you like; reading it is only possible after evaluating.',
  'exam.productionNote':
    'This task is not evaluated automatically — the app cannot reliably judge free texts and spoken answers. Write or speak first yourself, then compare with the model answer.',
  'exam.modelAnswerTitle': 'Model answer',
  'exam.listenModel': 'Listen to the model answer',
  'exam.selfCheck': 'Self-check',
  'exam.showModel': 'Show the model answer',

  /* ---------- Free writing (writing-runner) ---------- */
  'writing.promptDe': 'What is this called in German? With the article, if there is one.',
  'writing.promptTh': 'How do you write this in Thai? With tone marks.',
  'writing.promptEs': 'How do you write this in Spanish? With accents.',
  'writing.promptEn': 'How do you write this in English?',
  'writing.assembling': 'Preparing the round …',
  'writing.noneForDirection': 'For this direction there is no vocabulary with a typeable target form yet.',
  'writing.summary': '{{correct}} of {{total}} correct, {{exact}} of them without typing errors.',
  'writing.countsAsReview':
    'This round counts as a review: unlike the multiple-choice exercises, free writing updates the card state (AE-40).',
  'writing.inputA11y': 'Enter the answer',
  'writing.checkA11y': 'Check the answer',
  'writing.check': 'Task {{index}} of {{total}}',
  'writing.taskOf': 'Task {{index}} of {{total}}',

  /* ---------- Rating note (writing-runner, dictation-runner) ---------- */
  'rating.ratedAs': 'Rated as “{{rating}}”. {{explanation}}',

  /* ---------- Speaking exercise (speaking-runner) ---------- */
  'speaking.noticeClip': 'AI clip played — listening example only, never the grading standard.',
  'speaking.noticeTts': 'Device voice played — listening example only, never the grading standard.',
  'speaking.noticeNone': 'No listening example is available on this device.',
  'speaking.noticeError':
    'The listening example could not be played. Recording works independently of this.',
  'speaking.loadFailedTitle': 'Speaking exercise could not be loaded',
  'speaking.assembling': 'Preparing the speaking exercise …',
  'speaking.noTarget': 'No matching target contour',
  'speaking.noTargetBody':
    'The exercise uses only fully source-verified, monosyllabic Thai words. This way no syllable boundary is guessed.',
  'speaking.roundSummaryOne':
    '{{count}} tone contour evaluated locally. There is deliberately no score: what was measured is not the complete pronunciation.',
  'speaking.roundSummaryMany':
    '{{count}} tone contours evaluated locally. There is deliberately no score: what was measured is not the complete pronunciation.',
  'speaking.progress': 'Word {{index}} of {{total}}',
  'speaking.exitA11y': 'Leave the speaking exercise',
  'speaking.sayThisWord': 'Say this word',
  'speaking.playExample': 'Synthetic listening example',
  'speaking.clipNote':
    'The clip only helps for listening. The evaluation does not compare your recording with this voice.',
  'speaking.privacyTitle': 'Microphone and privacy',
  'speaking.scopedNote':
    'Only the pitch contour is evaluated — not consonants, vowel length, aspiration or the complete pronunciation; that is why there is no score.',
  'speaking.permissionNote':
    'If permission is still missing, the system prompt only appears when you choose “{{action}}”. After at most four seconds the recording stops automatically.',
  'speaking.stop': 'Stop and evaluate locally',
  'speaking.requestingPermission': 'Requesting microphone permission …',
  'speaking.evaluating': 'Evaluating locally …',
  'speaking.start': 'Start recording',
  'speaking.discard': 'Discard',
  'speaking.recording': '● Recording · {{seconds}} s',
  'speaking.retry': 'Record again',
  'speaking.nextWord': 'Next word',
  'speaking.noFsrs': 'This partial measurement does not change your FSRS card box.',
  'speaking.targetForm': 'Target form: {{tone}}',
  'speaking.source':
    'Source: source-verified syllable tone from Wiktionary IPA{{link}}. Not from TTS or an audio clip.',
  'speaking.sourceLink': ' · source link in the vocabulary entry',
  'speaking.verdictCompatible': 'Contour compatible',
  'speaking.verdictNeedsWork': 'Contour not yet compatible',
  'speaking.verdictRegister': 'Contour measured – register open',
  'speaking.verdictUnreliable': 'Not reliably measurable',
  'speaking.curveNote':
    'Measured curve: relative semitones; the dashed line is the median of this recording.',
  'speaking.measuredLine':
    'Evaluated voiced span: {{duration}} ms · recording: {{seconds}} s{{limit}}',
  'speaking.autoStopped': ' · stopped automatically',
  'speaking.limitationsTitle': 'What this feedback does not evaluate',

  /* ---------- Dictation (dictation-runner) ---------- */
  'dictation.promptTh': 'Write down the sentence you hear — with tone marks.',
  'dictation.promptDe': 'Write down the sentence you hear — with capitalisation.',
  'dictation.promptEs': 'Write down the sentence you hear — with accents.',
  'dictation.promptEn': 'Write down the sentence you hear.',
  'dictation.noVoice':
    'No sentence clip and no {{language}} system voice available. Install a {{language}} voice or use a device with {{language}} speech output.',
  'dictation.slowClipOnly':
    'Only an included sentence clip can be slowed down — the system voice plays at normal speed.',
  'dictation.slowUnsupported':
    'Slowing down is not supported on this device — normal speed.',
  'dictation.noneFor': 'No dictation material for {{language}} yet',
  'dictation.summary': '{{correct}} of {{total}} passed, {{exact}} of them error-free.',
  'dictation.onlyPassedRate':
    'Only passed dictations advanced the review schedule of the corresponding vocabulary.',
  'dictation.newRoundA11y': 'New dictation round',
  'dictation.progress': 'Dictation {{index}} of {{total}}',
  'dictation.exit': 'Leave dictation',
  'dictation.play': 'Listen to the sentence',
  'dictation.playSlowA11y': 'Listen to the sentence slowed down',
  'dictation.slow': 'Slow',
  'dictation.relistenNote': 'Listening repeatedly is explicitly allowed — also after “{{action}}”.',
  'dictation.inputA11y': 'Enter the dictation',
  'dictation.check': 'Check',
  'dictation.checkA11y': 'Check the dictation',
  'dictation.passed': '✓ Passed',
  'dictation.failed': '✗ Not yet passed',
  'dictation.baseScore': 'Base spelling {{base}} %{{tonePart}}',
  'dictation.toneScorePart': ' · tone/diacritic marks {{score}} %',
  'dictation.tooMuch': 'Typed too much: {{tokens}}',
  'dictation.notRated':
    'Not passed — the review schedule of the vocabulary stays unchanged. Only passed dictations count as a review.',

  /* ---------- Sentence exercises (sentence-runner) ---------- */
  'sentence.interrupted': 'Interrupted. The recording was discarded; prepare the sentence again.',
  'sentence.noVoice':
    'No sentence clip and no {{language}} system voice available. Install a {{language}} voice or use a device with {{language}} speech output. Without an audible sentence no answer is evaluated.',
  'sentence.playFailed': 'Sentence playback failed. Try again.',
  'sentence.measureFailed': 'The recording could not be evaluated.',
  'sentence.modelFailed': 'The model could not start. The recording was discarded.',
  'sentence.noneFor': 'No sentence material for {{language}} yet',
  'sentence.listeningSummary': '{{correct}} of {{total}} sentence meanings chosen correctly.',
  'sentence.spokenSummary':
    '{{total}} sentences completed. No pronunciation evaluation and no change to the review schedule.',
  'sentence.progress': 'Sentence {{index}} of {{total}}',
  'sentence.exit': 'Leave the sentence exercise',
  'sentence.titleShadowing': 'Speak along with the sentence',
  'sentence.titleRepeat': 'Repeat the same sentence',
  'sentence.roundHint': 'Round {{round}} of 3 · 12 / 9 / 6 seconds.',
  'sentence.hintA11y': 'Background on the exercise format',
  'sentence.hintShow': '▼ Show background',
  'sentence.hintHide': '▲ Hide background',
  'sentence.hintRepeat':
    'The 4:3:2 ratio adapted to short sentences, not a 4/3/2-minute monologue. The effect of changing listeners and real communicative intent is not covered here.',
  'sentence.hintShadowing':
    'Listen to the sentence first. Then speak along while the model plays. Use headphones: over a loudspeaker the model can end up in your microphone measurement.',
  'sentence.prepare': 'Mandatory preparation · {{seconds}} seconds left',
  'sentence.prepareBody':
    'Clarify the meaning and plan the whole sentence. {{focus}} The 15 seconds are an exercise decision, not a scientifically determined optimum.',
  'sentence.listen': 'Listen to the sentence',
  'sentence.listenAgain': 'Listen to the sentence again',
  'sentence.exampleNote': 'The listening example is not a benchmark for your recording.',
  'sentence.headphones': 'I am using headphones',
  'sentence.headphonesOk': 'Headphones confirmed',
  'sentence.micNote':
    'Microphone only after “{{action}}”. Volatile device memory only, no upload. At most {{seconds}} seconds; afterwards the recording is evaluated and discarded.',
  'sentence.start': 'Start recording',
  'sentence.remaining': '{{seconds}} seconds left',
  'sentence.stop': 'Stop recording',
  'sentence.measurement': 'Local measurement · {{seconds}} seconds of recording',
  'sentence.voicedNote':
    '{{percent}} % of the analysis windows show measurable periodicity. This is not a speech-time, tempo or fluency grade.',
  'sentence.limitReached':
    'The time window has expired; whether the sentence was complete is not detected.',
  'sentence.contourNote':
    'Only the longest contiguous F0 span, {{duration}} ms. No target comparison for the sentence; word tones, consonants, vowel length, aspiration and completeness are not evaluated.',
  'sentence.noVoiced':
    'No sufficiently voiced span measurable. This does not mean your sentence was wrong.',
  'sentence.reprepare': 'Prepare again',
  'sentence.nextWindow': 'Prepare the next time window',
  'sentence.nextSentence': 'Next sentence',
  'sentence.questionPrompt': 'Which complete statement or question did you hear?',
  'sentence.correct': 'Correct.',
  'sentence.meant': 'What was meant: {{answer}}',

  /* ---------- Word with marking (term-word) ---------- */
  'term.stressed': 'stressed: {{syllable}}',

  /* ---------- Source badge (verification-badge) ---------- */
  'verification.a11y': 'Show note on the source situation',
  'verification.label': 'Meaning not source-verified',
  'verification.noNote': 'No further note recorded.',

  /* ---------- Diagnostics (diagnostics-card) ---------- */
  'diagnostics.title': 'Diagnostics',
  'diagnostics.body':
    'What is stored and where it is stored. Of no relevance for learning — useful when something does not look as expected.',
  'diagnostics.tableA11y': 'Vocabulary per language',
  'diagnostics.row': '{{stored}} in storage · {{shipped}} shipped · {{verified}} source-verified',
  'diagnostics.backends': 'Data store: {{data}} · image store: {{images}} · clip store: {{clips}}',
  'diagnostics.loading': 'Loading …',

  /* ---------- Measured tone contour (measured-tone-contour) ---------- */
  'contour.measuredA11y': 'Measured tone contour in relative semitones: {{points}}',

  /* ---------- Vocabulary image (vocab-image) ---------- */
  'vocabImage.a11y': 'Image for {{word}}',

  /* ---------- API keys (api-keys-card, debug) ---------- */
  'apikeys.title': 'API keys (debug)',
  'apikeys.body':
    'Three fields for the content workflow: choose a provider, type the key, save. The choice applies to the associated generator groups; in the web studio you can still choose differently per run.',
  'apikeys.labelText': '1 · Text',
  'apikeys.labelAudio': '2 · Audio',
  'apikeys.labelImages': '3 · Images',
  'apikeys.textHint':
    'Produces vocabulary texts, sentences and conversation situations (generator groups “language situations” and “exam content”).',
  'apikeys.audioHint':
    'Adds audio to vocabulary, sentences and practice dialogues. After each clip the pitch check runs automatically; rejected clips are not saved.',
  'apikeys.imagesHint': 'Produces the vocabulary images.',
  'apikeys.providerSet': '{{capability}}: provider {{provider}} set for {{count}} group(s).',
  'apikeys.keySaved': '{{capability}}: key for {{provider}} saved.',
  'apikeys.keyCleared': '{{capability}}: key for {{provider}} deleted.',
  'apikeys.emptyField': 'The field is empty — use “{{action}}” to remove a key.',
  'apikeys.badKey': 'This does not look like a key: at least 20 characters, no spaces.',
  'apikeys.storedPlaceholder': 'saved — type again to replace',
  'apikeys.save': 'Save key',
  'apikeys.delete': 'Delete',
  'apikeys.modeSecure':
    'Keys are stored encrypted on this device (Keychain/Keystore) and survive restarts. They are never shipped with the app.',
  'apikeys.modeSession':
    'This environment has no secure storage — keys stay in memory only for this session and are gone after reloading. That is intentional (AE-10).',
  'apikeys.modeChecking': 'Checking storage …',

  /* ---------- Generator card (generator-card, debug) ---------- */
  'generator.badKey': 'This does not look like a key (too short or with spaces).',
  'generator.keySaved': 'Key applied.',
  'generator.keyCleared': 'Key deleted.',
  'generator.needKey': 'Enter an API key first.',
  'generator.deleted': 'Stock deleted.',
  'generator.language': 'Language',
  'generator.languageFor': 'Language for {{what}}',
  'generator.languageNote':
    'Everything is always produced for exactly one language. What has already been produced stays — a second run for another language takes nothing away.',
  'generator.provider': 'Provider',
  'generator.providerFor': 'Provider for {{what}}',
  'generator.keySource': '{{label}}: key from {{source}}.',
  'generator.keySourceVia': '{{label}} comes from {{vendor}}; key from {{source}}.',
  'generator.providersAudio':
    'Only providers with speech output can be chosen — Claude and Stability AI have none.',
  'generator.providersImages':
    'Only providers that produce images can be chosen — Claude cannot produce images, Stability AI no text.',
  'generator.providersText':
    'Only providers that produce text can be chosen — Claude cannot produce images, Stability AI no text.',
  'generator.model': 'Model',
  'generator.modelFor': 'Model name for {{what}}',
  'generator.modelNote':
    'Free text, deliberately unchecked: model names change too often to hard-code them in the app. Leave empty to take “{{placeholder}}”. {{geminiNote}}',
  'generator.modelNoteGemini':
    'With Gemini, a typo in the name cannot be distinguished from the wrong key — the API reports both as “API key not valid” (measured, AE-26).',
  'generator.voice': 'Voice',
  'generator.genderFor': 'Voice type for {{what}}',
  'generator.female': 'Female',
  'generator.male': 'Male',
  'generator.genderGoogle':
    'Google does not name the gender of its voices on the Gemini page, but in the “Voice options” table of the Cloud Text-to-Speech documentation — the same thirty names, retrieved {{date}}. The buttons set a documented voice of that type; the field below takes any other.',
  'generator.genderUnknown':
    '{{vendor}} gives no information about the gender of its voices (retrieved {{date}}). A “female/male” choice would be a guess here, so there are only the names.',
  'generator.voiceFor': 'Voice for {{what}}',
  'generator.voiceChosen': '{{voice}}: {{description}}.',
  'generator.voiceEmpty': 'Leave empty to take “{{placeholder}}”.',
  'generator.voiceSynthetic':
    'All voices are synthetic, no native-speaker recordings — which one hits the Thai tones was measured (AE-31), not promised.',
  'generator.keyFor': 'API key for {{vendor}}',
  'generator.storedPlaceholder': 'saved — type again to replace',
  'generator.modeSecure':
    'Stored encrypted on the device (Keychain/Keystore) and survives restarts. Each provider has its own place — switching here deletes no other key.',
  'generator.modeSession':
    'The browser has no secure storage — the key stays in memory only for this session and is gone after reloading. That is intentional (AE-10).',
  'generator.saveKey': 'Apply key',
  'generator.delete': 'Delete',
  'generator.scope': 'Scope',
  'generator.scopeFor': 'Scope for {{what}}',
  'generator.stop': 'Stop',
  'generator.start': 'Start',
  'generator.estimateTitle': '{{count}} provider calls · {{provider}} · {{model}}',
  'generator.deliveryTitle': 'Delivery preview for {{total}} planned clips',
  'generator.deliveryStats':
    '{{toneCheckable}} Thai clips tone-checkable · {{technicalOnly}} clips only technically checkable · {{unchecked}} Thai clips delivered unchecked · {{excluded}} excluded',
  'generator.deliveryNote':
    'At most {{passable}} of {{total}} clips ({{percent}} %) can pass. The actual pass rate is only known after the tone and integrity checks; it can be lower. The costs apply to the missing generations, including clips excluded later.',
  'generator.costInputA11y': 'Estimated total cost in USD',
  'generator.costPlaceholder': 'Total estimate USD',
  'generator.cost': 'Estimated cost: {{usd}} USD',
  'generator.confirmCost': 'Confirm cost and start the run',
  'generator.showErrors': 'Show {{count}} failures',
  'generator.confirmDelete': 'Really delete everything?',
  'generator.progress': '{{processed}} / {{total}}{{status}}',
  'generator.progressHalted': ' — stopped',
  'generator.progressDone': ' — done',
  'generator.countOk': 'Generated',
  'generator.countFailed': 'Failed',
  'generator.countSkipped': 'Skipped',
  'generator.tonePassed': 'Tone passed',
  'generator.toneRejected': 'Tone rejected',
  'generator.toneUnchecked': 'Tone unchecked',
  'generator.current': 'current: {{item}}',
};

export default en;
