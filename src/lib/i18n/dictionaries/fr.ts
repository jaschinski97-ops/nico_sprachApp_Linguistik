import type { TranslationKey } from '../keys';

/**
 * Français — traduction complète du jeu de référence allemand.
 * Les clés manquantes retombent sur l’allemand ; le test d’intégrité les signale.
 */
const fr: Partial<Record<TranslationKey, string>> = {
  'common.retry': 'Réessayer',
  'common.recheck': 'Revérifier',
  'common.loadFailed': 'Impossible de charger : {{message}}',
  'common.languageLabel': 'Langue',
  'common.switchLanguageA11y': 'Changer de langue',
  'common.learnGoal': 'Apprendre {{language}}',
  'common.unknownError': 'Erreur inconnue.',

  'tabs.overview': 'Aperçu',
  'tabs.learn': 'Apprendre',
  'tabs.conversation': 'Conversation',
  'tabs.exam': 'Examen',
  'tabs.progress': 'Progrès',
  'tabs.settings': 'Réglages',
  'tabs.brand': 'Compagnon d’apprentissage',
  'tabs.mainNavA11y': 'Navigation principale',

  'home.subtitle': 'Quelle langue apprends-tu aujourd’hui ?',
  'home.systemLanguage': 'Langue du système : {{language}}',

  'picker.hubNote':
    'L’allemand est toujours l’une des deux faces — on apprend dans les deux sens.',
  'picker.chooseA11y': 'Choisir la langue',
  'picker.vocabAndFeature': '{{count}} mots · Particularité : {{feature}}',
  'picker.empty': 'Pas encore de contenu.',
  'picker.emptyFeature': 'Particularité choisie : {{feature}}{{kindNote}}.',
  'picker.kindDerivable': ' — déductible de l’écriture',
  'picker.kindPerWord': ' — à mémoriser mot par mot',

  'dashboard.title': 'Cartes à revoir',
  'dashboard.loading': 'Chargement de l’état des cartes …',
  'dashboard.learnA11y': 'Apprendre {{direction}}, {{count}} cartes à revoir',
  'dashboard.dueOne': 'carte à revoir',
  'dashboard.dueMany': 'cartes à revoir',
  'dashboard.totals': '{{total}} cartes au total · {{fresh}} nouvelles · {{mastered}} maîtrisées',
  'dashboard.cta': 'Exercer cette direction →',

  'legend.toneTitle': 'Couleurs des tons',
  'legend.toneBody':
    'Les cinq tons du thaï. Dans les mots polysyllabiques, chaque syllabe porte son propre ton — les couleurs figurent donc sur la translittération, syllabe par syllabe.',
  'tone.mid': 'Moyen',
  'tone.low': 'Bas',
  'tone.falling': 'Descendant',
  'tone.high': 'Haut',
  'tone.rising': 'Montant',
  'legend.stressTitle': 'Accentuation',
  'legend.stressBody':
    'La syllabe accentuée se lit dans l’orthographe — deux règles et une exception. Qui les connaît n’a plus à vérifier l’accent d’aucun mot nouveau.',
  'legend.stressRulePenultimate': 'Se termine par une voyelle, « n » ou « s »',
  'legend.stressRuleFinal': 'Se termine par une autre consonne',
  'legend.stressRuleAcute': 'Un accent aigu est écrit',
  'legend.stressDetailPenultimate': 'avant-dernière syllabe',
  'legend.stressDetailFinal': 'dernière syllabe',
  'legend.stressDetailAcute': 'exactement là — la règle est suspendue',
  'legend.stressAcuteNote':
    'Un accent aigu sur « í » ou « ú » fait encore autre chose : il sépare deux voyelles qui formeraient sinon une seule syllabe — « día » en a donc deux.',
  'legend.spellingTitle': 'Prononciation',
  'legend.spellingBody':
    'Contrairement au thaï et à l’espagnol, pas de règle ici : la même suite de lettres se prononce différemment d’un mot à l’autre. Ce n’est pas un défaut de l’application, c’est le constat — il faut le savoir mot par mot.',
  'feature.tones': 'Tons',
  'feature.stress': 'Accentuation',
  'feature.pronunciation': 'Prononciation',
  'feature.gender': 'Genre',

  'flashcard.listenA11y': 'Écouter {{language}}',
  'flashcard.listenGermanA11y': 'Écouter l’allemand',
  'flashcard.listenExampleA11y': 'Écouter la phrase d’exemple',
  'flashcard.plural': 'Pluriel : {{plural}}',

  'review.subtitle': 'Sens d’apprentissage',
  'review.loadingProfile': 'Chargement du profil d’apprentissage …',
  'review.pickSubtitle': '{{language}} — quel sens veux-tu exercer ?',
  'review.switch': '← Changer de langue ou de sens',
  'review.switchA11y': 'Changer de langue ou de sens d’apprentissage',
  'mode.cards': 'Cartes-mémo',
  'mode.speaking': 'Parler',
  'mode.writing': 'Écrire',
  'mode.shadowing': 'Shadowing',
  'mode.sentenceRepeat': 'Répéter la phrase',
  'mode.sentenceListening': 'Comprendre la phrase',
  'mode.dictation': 'Dictée',
  'drill.tone': 'Entendre les tons',
  'drill.toneRule': 'Déduire le ton',
  'drill.article': 'Articles',
  'drill.verbForms': 'Formes verbales',
  'drill.stressRule': 'Déduire l’accent',
  'drill.spelling': 'Même écriture, autre son',
  'drill.stressHear': 'Entendre l’accent',
  'drill.soundSpelling': 'Entendre le mot',
  'drill.stressFr': 'Trouver l’accent',
  'drill.muteE': 'E muet',
  'drill.accentFr': 'Lire les accents',
  'skill.wortschatz': 'Vocabulaire',
  'skill.hoeren': 'Écouter',
  'skill.lesen': 'Lire',
  'skill.sprechen': 'Parler',
  'skill.schreiben': 'Écrire',
  'skill.grammatik': 'Grammaire allemande',
  'cards.loadFailedTitle': 'Impossible de charger la session',
  'cards.assembleFailed': 'Impossible d’assembler : {{message}}',
  'cards.assembling': 'Assemblage de la session …',
  'cards.done': 'Session terminée',
  'cards.nothingDue': 'Rien à revoir',
  'cards.summaryRated': '{{rated}} cartes évaluées, dont {{again}} « Encore ».',
  'cards.summaryIdle':
    'Aucune carte n’est à revoir dans ce sens pour le moment. Les exercices ci-dessus restent disponibles — ils n’exigent aucune échéance.',
  'cards.progress': 'Carte {{index}} sur {{total}}',
  'rating.again': 'Encore',
  'rating.hard': 'Difficile',
  'rating.good': 'Bien',
  'rating.easy': 'Facile',
  'rating.a11y': 'Évaluation {{label}}',
  'card.reveal': 'Révéler',
  'card.revealA11y': 'Révéler la réponse',

  'conversation.subtitle': 'Situations linguistiques préproduites',
  'conversation.loading': 'Chargement des situations …',
  'conversation.subtitleLanguage': 'Situations linguistiques préproduites · {{language}}',
  'conversation.subtitleCount': '{{count}} situations — utilisables hors ligne',
  'conversation.noneFor': 'Pas encore de situations pour {{language}}',
  'conversation.noneForBody':
    'Cette version de l’application ne contient pas encore de dialogues pour {{language}}. Cartes et exercices se trouvent dans « Apprendre ». D’autres contenus arrivent avec les mises à jour.',
  'conversation.noneForDirection':
    'Cette version de l’application ne contient pas encore de dialogues pour ce sens.',
  'conversation.variant': ' · Variante {{count}}',
  'conversation.you': 'Vous',
  'conversation.partner': 'Interlocuteur',
  'conversation.mistakesTitle': 'Erreurs typiques',
  'conversation.aiVoice': 'Voix de synthèse',
  'conversation.listenA11y': 'Écouter : {{text}}',
  'conversation.syntheticNote': ' (voix synthétique, pas d’enregistrement natif)',
  'topic.greeting': 'Salutations et premières rencontres',
  'topic.market': 'Marché et achats',
  'topic.restaurant': 'Restaurant et repas',
  'topic.travel': 'En déplacement',

  'exam.subtitle': 'Préparation aux certificats Goethe',
  'exam.subtitleModule': 'Module',
  'exam.moduleLoadFailed': 'Impossible de charger le module',
  'exam.partsAsModules': 'Quatre modules, à passer séparément ou en combinaison.',
  'exam.partsTogether': 'Quatre épreuves, à passer ensemble.',
  'exam.recommendation':
    'Recommandé à partir de {{age}} ans ; jusqu’à ce niveau, le Goethe-Institut compte {{units}} unités d’enseignement de 45 minutes.',
  'exam.approxPrefix': 'environ ',
  'exam.minutes': '{{minutes}} minutes',
  'exam.formatGroup': ' · Examen en groupe',
  'exam.formatPair': ' · Examen en binôme',
  'exam.retrievedPrefix': 'Structure consultée le {{date}} sur ',
  'exam.retrievedSuffix': '. Vérifiez-y à nouveau avant l’inscription — les formats d’examen évoluent.',
  'exam.loading': 'Chargement des tâches …',
  'exam.noModules':
    'Pas encore de tâche pour {{level}}. D’autres arrivent avec les mises à jour de l’application.',
  'exam.moduleMinutes': 'environ {{minutes}} min',
  'exam.aboutTitle': 'Ce que c’est — et ce que ce n’est pas',
  'exam.aboutBody':
    'La structure ci-dessus vient du Goethe-Institut. Les tâches, en revanche, sont écrites par nous : ni tâches originales ni modèles du Goethe-Institut. Les modèles authentiques et le matériel d’entraînement se trouvent auprès du Goethe-Institut lui-même.',
  'exam.aboutGermanOnly':
    'Le Goethe-Institut certifie l’allemand. Ce module s’adresse donc à tous ceux qui apprennent l’allemand — que leur langue soit le thaï, l’anglais ou l’espagnol. Pour le sens inverse (allemand → thaï), il existe un petit début A1 d’après le squelette Goethe — c’est un entraînement au format de l’examen, pas un examen officiel.',

  'progress.subtitle': 'Historique d’apprentissage',
  'progress.subtitleLanguage': 'Historique d’apprentissage · {{language}}',
  'progress.loading': 'Chargement de l’état d’apprentissage …',
  'tile.reviewsToday': 'Révisions du jour',
  'tile.drillsToday': 'Exercices du jour',
  'tile.drillsHint': 'Exercices',
  'tile.streak': 'Jours d’affilée',
  'tile.dayOne': 'jour',
  'tile.dayMany': 'jours',
  'tile.started': 'Commencées',
  'tile.mastered': 'Maîtrisées',
  'chart.perDay': 'Par jour',
  'chart.legendReviews': 'Révisions',
  'chart.legendDrills': 'Exercices',
  'chart.columnA11y': '{{date}} : {{reviews}} révisions, {{drills}} exercices',
  'chart.loggedSinceWithDrills':
    'Enregistré depuis le {{since}} · {{reviews}} révisions au total et {{drills}} exercices, dont {{correct}} corrects. Les séances antérieures ne figurent pas — le registre journalier n’existe que depuis cette version.',
  'chart.loggedSince':
    'Enregistré depuis le {{since}} · {{reviews}} révisions au total. Les séances antérieures ne figurent pas — le registre journalier n’existe que depuis cette version.',
  'chart.empty':
    'Pas encore de révisions enregistrées. L’historique commence avec la première carte évaluée ; les séances antérieures ne figurent pas.',
  'state.new': 'Nouvelle',
  'state.learning': 'En cours',
  'state.review': 'Installée',
  'state.mastered': 'Maîtrisée',
  'states.title': 'États des cartes',
  'states.empty':
    'Pas encore de carte évaluée. Dès que tu évalues la première dans l’onglet « Apprendre », sa répartition apparaît ici.',
  'states.distributionA11y': 'Répartition des cartes commencées : {{parts}}',
  'states.masteredNote':
    '« Maîtrisée » signifie : la stabilité calculée dépasse 21 jours.',
  'states.allStarted': 'Toutes les cartes de cette langue sont commencées.',
  'states.notStarted': 'Pas encore commencées : {{count}} sur {{total}} cartes.',

  'settings.subtitle': 'Ton compagnon d’apprentissage',
  'settings.materialTitle': 'Ton matériel d’apprentissage',
  'settings.materialCount': '{{count}} mots · thaï, anglais et espagnol',
  'settings.materialBody':
    'Le matériel d’apprentissage fait partie de l’application. Mots, dialogues et exercices nouveaux arrivent avec les mises à jour. Ta progression reste sur cet appareil.',
  'settings.warningTitle': 'La progression n’est sauvegardée que jusqu’à la fermeture',
  'settings.warningBody':
    'Le stockage permanent de cet appareil n’a pas pu être ouvert. Tout ce que tu apprends maintenant sera perdu à la fermeture. Enregistre ta progression ci-dessous en fichier tant qu’elle est là.',
  'appLanguage.title': 'Langue de l’application',
  'appLanguage.body':
    'L’application démarre dans la langue de ton appareil. Tu peux la fixer ici.',
  'appLanguage.system': 'Système',
  'backup.title': 'Sauvegarde et restauration',
  'backup.body':
    'Enregistre ta progression en fichier — par exemple avant un changement d’appareil ou une réinstallation. Tu peux restaurer une telle sauvegarde ici ; elle remplace alors l’historique de cet appareil.',
  'backup.exportA11y': 'Enregistrer l’historique en fichier',
  'backup.importA11y': 'Lire la sauvegarde et remplacer l’historique',
  'backup.exportButton': 'Enregistrer l’historique',
  'backup.exporting': 'Sauvegarde en cours …',
  'backup.importButton': 'Restaurer la sauvegarde',
  'backup.importing': 'Lecture de la sauvegarde …',
  'backup.created': 'Sauvegarde créée : {{fileName}}',
  'backup.failed': 'Voici ce qui a échoué : {{message}}',
  'backup.applied': 'Importé : {{parts}}.',
  'backup.fromDate': ' (sauvegarde du {{date}}.)',
  'backup.partsCards': '{{cards}} cartes',
  'backup.partsLog': '{{days}} jours de registre',
  'backup.partsProfile': 'Profil d’apprentissage',
  'backup.confirmTitle': 'Remplacer l’historique ?',
  'backup.confirmQuestion':
    'La sauvegarde remplacera tout ton historique d’apprentissage sur cet appareil. Faire ce pas ?',
  'backup.confirmCancel': 'Annuler',
  'backup.confirmReplace': 'Remplacer',

  /* ---------- Éléments communs des runners d’exercices ---------- */
  'common.back': 'Retour',
  'common.next': 'Suivant',
  'common.cancel': 'Annuler',
  'common.failed': 'Échec : {{message}}',

  /* ---------- Exercices (drill-runner ; textes de manche partagés) ---------- */
  'drill.loadFailedTitle': 'Impossible de charger l’exercice',
  'drill.assembling': 'Préparation de l’exercice …',
  'drill.noVocab': 'Aucun vocabulaire approprié',
  'drill.toneEmpty':
    'Aucun clip approprié avec ton vérifié n’est disponible pour la reconnaissance tonale. Les clips non vérifiés et les voix du système ne sont pas utilisés ici.',
  'drill.noneFor': 'Il n’y a actuellement aucune entrée appropriée pour « {{drill}} » dans le stock de base.',
  'drill.roundDone': 'Manche terminée',
  'drill.roundScore': '{{correct}} sur {{total}} correctes.',
  'drill.newRound': 'Nouvelle manche',
  'drill.questionProgress': 'Tâche {{index}} sur {{total}}',
  'drill.exit': 'Quitter l’exercice',
  'drill.playAgain': '🔊 Réécouter',
  'drill.playAgainA11y': 'Réécouter le mot',
  'drill.voiceMissing': 'Cet exemple audio n’est pas disponible. Tu peux continuer à t’exercer dans « {{skill}} ».',
  'drill.correct': '✓ Correct',
  'drill.wrong': '✗ Pas tout à fait',
  'drill.exact': '✓ Exactement correct',
  'drill.derivationA11y': 'Déduction du ton',
  'drill.mistakesTitle': 'Pas encore acquis :',
  'drill.prompt.tone': 'Quel ton entends-tu ?',
  'drill.prompt.toneRule': 'Quel ton a ce mot ?',
  'drill.prompt.article': 'Quel article correspond au mot ?',
  'drill.prompt.verbForms': 'Quel est le parfait ?',
  'drill.prompt.stressRule': 'Quelle syllabe est accentuée ?',
  'drill.prompt.spelling': 'Comment sonne cette graphie ici ?',
  'drill.prompt.stressHear': 'Quelle syllabe entends-tu accentuée ?',
  'drill.prompt.soundSpelling': 'Quel mot entends-tu ?',
  'drill.prompt.muteE': 'Combien de syllabes entends-tu ?',
  'drill.prompt.accentFr': 'Comment sonne le signe surligné ?',

  /* ---------- Tâche d’examen (exam-runner) ---------- */
  'exam.taskMultipleChoice': 'Choix multiple (A/B/C)',
  'exam.taskTrueFalse': 'Vrai ou faux',
  'exam.taskMatching': 'Association',
  'exam.taskGapFill': 'Texte à trous',
  'exam.taskProduction': 'Production libre',
  'exam.backA11y': 'Retour à la vue d’ensemble des tâches',
  'exam.back': 'Retour à la vue d’ensemble',
  'exam.score': '{{correct}} sur {{total}} correctes',
  'exam.noPassMark':
    'Ceci est un exercice d’entraînement, pas un examen — aucun seuil de réussite n’est fixé ici, volontairement, car il ne provient pas de la source.',
  'exam.check': 'Évaluer',
  'exam.checkDisabled': 'Merci de répondre à toutes les tâches',
  'exam.listen': 'Écouter le texte',
  'exam.audioNote':
    'Le texte est lu à voix haute. Vous pouvez l’écouter autant de fois que vous le souhaitez ; sa lecture n’est possible qu’après l’évaluation.',
  'exam.productionNote':
    'Cette tâche n’est pas évaluée automatiquement — l’application ne peut pas juger de façon fiable les textes libres ni les réponses orales. Écris ou parle d’abord toi-même, puis compare avec la réponse modèle.',
  'exam.modelAnswerTitle': 'Réponse modèle',
  'exam.listenModel': 'Écouter la réponse modèle',
  'exam.selfCheck': 'Autocontrôle',
  'exam.showModel': 'Afficher la réponse modèle',

  /* ---------- Écriture libre (writing-runner) ---------- */
  'writing.promptDe': 'Comment cela s’appelle-t-il en allemand ? Avec l’article, s’il y en a un.',
  'writing.promptTh': 'Comment écrit-on cela en thaï ? Avec les signes de ton.',
  'writing.promptEs': 'Comment écrit-on cela en espagnol ? Avec les accents.',
  'writing.promptEn': 'Comment écrit-on cela en anglais ?',
  'writing.assembling': 'Préparation de la manche …',
  'writing.noneForDirection': 'Pour cette direction, il n’y a encore aucun mot avec une forme cible saisissable.',
  'writing.summary': '{{correct}} sur {{total}} correctes, dont {{exact}} sans faute de frappe.',
  'writing.countsAsReview':
    'Cette manche compte comme une répétition : contrairement aux exercices à choix, l’écriture libre fait évoluer l’état de la carte (AE-40).',
  'writing.inputA11y': 'Saisir la réponse',
  'writing.checkA11y': 'Vérifier la réponse',
  'writing.check': 'Exercice {{index}} sur {{total}}',
  'writing.taskOf': 'Exercice {{index}} sur {{total}}',

  /* ---------- Note d’évaluation (writing-runner, dictation-runner) ---------- */
  'rating.ratedAs': 'Évalué : « {{rating}} ». {{explanation}}',

  /* ---------- Exercice d’expression orale (speaking-runner) ---------- */
  'speaking.noticeClip': 'Clip d’IA joué — uniquement un exemple d’écoute, jamais un critère de notation.',
  'speaking.noticeTts': 'Voix de l’appareil jouée — uniquement un exemple d’écoute, jamais un critère de notation.',
  'speaking.noticeNone': 'Aucun exemple d’écoute n’est disponible sur cet appareil.',
  'speaking.noticeError':
    'L’exemple d’écoute n’a pas pu être joué. L’enregistrement fonctionne indépendamment.',
  'speaking.loadFailedTitle': 'Impossible de charger l’exercice d’expression orale',
  'speaking.assembling': 'Préparation de l’exercice d’expression orale …',
  'speaking.noTarget': 'Aucune courbe cible appropriée',
  'speaking.noTargetBody':
    'L’exercice n’utilise que des mots thaï monosyllabiques entièrement vérifiés à la source. Ainsi aucune frontière de syllabe n’est devinée.',
  'speaking.roundSummaryOne':
    '{{count}} courbe tonale évaluée localement. Il n’y a volontairement aucun score : ce qui a été mesuré n’est pas la prononciation complète.',
  'speaking.roundSummaryMany':
    '{{count}} courbes tonales évaluées localement. Il n’y a volontairement aucun score : ce qui a été mesuré n’est pas la prononciation complète.',
  'speaking.progress': 'Mot {{index}} sur {{total}}',
  'speaking.exitA11y': 'Quitter l’exercice d’expression orale',
  'speaking.sayThisWord': 'Dis ce mot',
  'speaking.playExample': 'Exemple d’écoute synthétique',
  'speaking.clipNote':
    'Le clip ne sert qu’à l’écoute. L’évaluation ne compare pas ton enregistrement à cette voix.',
  'speaking.privacyTitle': 'Micro et confidentialité',
  'speaking.scopedNote':
    'Seule la courbe de hauteur est évaluée — ni les consonnes, ni la longueur des voyelles, ni l’aspiration, ni la prononciation complète ; voilà pourquoi il n’y a pas de score.',
  'speaking.permissionNote':
    'Si l’autorisation manque encore, la demande système n’apparaît qu’au choix de « {{action}} ». Au bout de quatre secondes au plus, l’enregistrement s’arrête automatiquement.',
  'speaking.stop': 'Arrêter et évaluer localement',
  'speaking.requestingPermission': 'Demande d’autorisation du micro …',
  'speaking.evaluating': 'Évaluation locale …',
  'speaking.start': 'Démarrer l’enregistrement',
  'speaking.discard': 'Abandonner',
  'speaking.recording': '● Enregistrement · {{seconds}} s',
  'speaking.retry': 'Enregistrer à nouveau',
  'speaking.nextWord': 'Mot suivant',
  'speaking.noFsrs': 'Cette mesure partielle ne modifie pas ta boîte de cartes FSRS.',
  'speaking.targetForm': 'Forme cible : {{tone}}',
  'speaking.source':
    'Source : ton de syllabe vérifié à la source d’après l’IPA de Wiktionary{{link}}. Pas de la synthèse vocale ni d’un clip audio.',
  'speaking.sourceLink': ' · lien source dans l’entrée de vocabulaire',
  'speaking.verdictCompatible': 'Courbe compatible',
  'speaking.verdictNeedsWork': 'Courbe pas encore compatible',
  'speaking.verdictRegister': 'Courbe mesurée – registre incertain',
  'speaking.verdictUnreliable': 'Non mesurable de façon fiable',
  'speaking.curveNote':
    'Courbe mesurée : demi-tons relatifs ; la ligne pointillée est la médiane de cet enregistrement.',
  'speaking.measuredLine':
    'Segment sonore évalué : {{duration}} ms · enregistrement : {{seconds}} s{{limit}}',
  'speaking.autoStopped': ' · arrêté automatiquement',
  'speaking.limitationsTitle': 'Ce que cette rétroaction n’évalue pas',

  /* ---------- Dictée (dictation-runner) ---------- */
  'dictation.promptTh': 'Écris la phrase que tu entends — avec les signes de ton.',
  'dictation.promptDe': 'Écris la phrase que tu entends — avec les majuscules et minuscules.',
  'dictation.promptEs': 'Écris la phrase que tu entends — avec les accents.',
  'dictation.promptEn': 'Écris la phrase que tu entends.',
  'dictation.promptFr': 'Écris la phrase que tu entends.',
  'dictation.noVoice':
    'Aucun clip de phrase et aucune voix système en {{language}} disponibles. Installe une voix en {{language}} ou utilise un appareil avec sortie vocale en {{language}}.',
  'dictation.slowClipOnly':
    'Seul un clip de phrase intégré peut être ralenti — la voix système est jouée à vitesse normale.',
  'dictation.slowUnsupported':
    'Le ralentissement n’est pas pris en charge sur cet appareil — vitesse normale.',
  'dictation.noneFor': 'Pas encore de matériel de dictée pour {{language}}',
  'dictation.summary': '{{correct}} sur {{total}} réussies, dont {{exact}} sans faute.',
  'dictation.onlyPassedRate':
    'Seules les dictées réussies ont fait avancer le programme de répétition du mot correspondant.',
  'dictation.newRoundA11y': 'Nouvelle manche de dictée',
  'dictation.progress': 'Dictée {{index}} sur {{total}}',
  'dictation.exit': 'Quitter la dictée',
  'dictation.play': 'Écouter la phrase',
  'dictation.playSlowA11y': 'Écouter la phrase au ralenti',
  'dictation.slow': 'Lentement',
  'dictation.relistenNote': 'Écouter plusieurs fois est expressément permis — aussi après « {{action}} ».',
  'dictation.inputA11y': 'Saisir la dictée',
  'dictation.check': 'Vérifier',
  'dictation.checkA11y': 'Vérifier la dictée',
  'dictation.passed': '✓ Réussi',
  'dictation.failed': '✗ Pas encore réussi',
  'dictation.baseScore': 'Orthographe de base {{base}} %{{tonePart}}',
  'dictation.toneScorePart': ' · tons et diacritiques {{score}} %',
  'dictation.tooMuch': 'Saisi en trop : {{tokens}}',
  'dictation.notRated':
    'Non réussi — le programme de répétition du mot reste inchangé. Seules les dictées réussies comptent comme répétition.',

  /* ---------- Exercices de phrases (sentence-runner) ---------- */
  'sentence.interrupted': 'Interrompu. L’enregistrement a été jeté ; prépare la phrase à nouveau.',
  'sentence.noVoice':
    'Aucun clip de phrases et aucune voix système en {{language}}. Installe une voix {{language}} ou utilise un appareil avec sortie vocale en {{language}}. Sans phrase audible, aucune réponse n’est évaluée.',
  'sentence.playFailed': 'La lecture de la phrase a échoué. Réessaie.',
  'sentence.measureFailed': 'L’enregistrement n’a pas pu être évalué.',
  'sentence.modelFailed': 'Le modèle n’a pas pu démarrer. L’enregistrement a été jeté.',
  'sentence.noneFor': 'Pas encore de matériel de phrases pour {{language}}',
  'sentence.listeningSummary': '{{correct}} sens de phrases choisis correctement sur {{total}}.',
  'sentence.spokenSummary':
    '{{total}} phrases travaillées. Aucune évaluation de prononciation et aucun changement au programme de répétition.',
  'sentence.progress': 'Phrase {{index}} sur {{total}}',
  'sentence.exit': 'Quitter l’exercice de phrases',
  'sentence.titleShadowing': 'Parle en même temps que la phrase',
  'sentence.titleRepeat': 'Répète la même phrase',
  'sentence.roundHint': 'Manche {{round}} sur 3 · 12 / 9 / 6 secondes.',
  'sentence.hintA11y': 'Contexte de l’exercice',
  'sentence.hintShow': '▼ Afficher le contexte',
  'sentence.hintHide': '▲ Masquer le contexte',
  'sentence.hintRepeat':
    'Rapport 4:3:2 adapté aux phrases courtes, pas un monologue de 4/3/2 minutes. L’effet d’auditeurs qui changent et d’une vraie intention de communication n’est pas couvert ici.',
  'sentence.hintShadowing':
    'Écoute d’abord la phrase. Puis parle pendant que le modèle sonne. Utilise un casque : par haut-parleur, le modèle peut se retrouver dans ta mesure micro.',
  'sentence.prepare': 'Préparation obligatoire · encore {{seconds}} secondes',
  'sentence.prepareBody':
    'Clarifie le sens et planifie toute la phrase. {{focus}} Les 15 secondes sont un choix d’exercice, pas un optimum scientifiquement établi.',
  'sentence.listen': 'Écouter la phrase',
  'sentence.listenAgain': 'Réécouter la phrase',
  'sentence.exampleNote': 'L’exemple audio n’est pas une référence pour ton enregistrement.',
  'sentence.headphones': 'J’utilise un casque',
  'sentence.headphonesOk': 'Casque confirmé',
  'sentence.micNote':
    'Micro seulement après « {{action}} ». Mémoire volatile de l’appareil uniquement, aucun envoi. Au plus {{seconds}} secondes ; ensuite l’enregistrement est évalué puis jeté.',
  'sentence.start': 'Démarrer l’enregistrement',
  'sentence.remaining': 'Encore {{seconds}} secondes',
  'sentence.stop': 'Terminer l’enregistrement',
  'sentence.measurement': 'Mesure locale · {{seconds}} secondes d’enregistrement',
  'sentence.voicedNote':
    '{{percent}} % des fenêtres d’analyse présentent une périodicité mesurable. Ce n’est ni une note de temps de parole, de débit ni de fluidité.',
  'sentence.limitReached':
    'La fenêtre de temps est écoulée ; on ne détecte pas si la phrase était complète.',
  'sentence.contourNote':
    'Seul le plus long segment continu de F0, {{duration}} ms. Aucune comparaison à un modèle pour la phrase ; tons des mots, consonnes, durée des voyelles, aspiration et complétude ne sont pas évalués.',
  'sentence.noVoiced':
    'Aucun segment sonore assez long pour être mesuré. Cela ne signifie pas que ta phrase était fausse.',
  'sentence.reprepare': 'Se préparer à nouveau',
  'sentence.nextWindow': 'Préparer la fenêtre de temps suivante',
  'sentence.nextSentence': 'Phrase suivante',
  'sentence.questionPrompt': 'Quelle affirmation ou question complète as-tu entendue ?',
  'sentence.correct': 'Correct.',
  'sentence.meant': 'C’était : {{answer}}',

  /* ---------- Mot avec marquage (term-word) ---------- */
  'term.stressed': 'accentué : {{syllable}}',

  /* ---------- Badge de source (verification-badge) ---------- */
  'verification.a11y': 'Afficher la note sur l’état des sources',
  'verification.label': 'Sens non vérifié à la source',
  'verification.noNote': 'Aucune note supplémentaire enregistrée.',

  /* ---------- Diagnostic (diagnostics-card) ---------- */
  'diagnostics.title': 'Diagnostic',
  'diagnostics.body':
    'Ce qui est stocké et où c’est stocké. Sans importance pour l’apprentissage — utile quand quelque chose n’a pas l’air conforme.',
  'diagnostics.tableA11y': 'Vocabulaire par langue',
  'diagnostics.row': '{{stored}} en stockage · {{shipped}} livrés · {{verified}} vérifiés à la source',
  'diagnostics.backends': 'Stockage de données : {{data}} · stockage d’images : {{images}} · stockage de clips : {{clips}}',
  'diagnostics.loading': 'Chargement …',

  /* ---------- Courbe tonale mesurée (measured-tone-contour) ---------- */
  'contour.measuredA11y': 'Courbe tonale mesurée en demi-tons relatifs : {{points}}',

  /* ---------- Image de vocabulaire (vocab-image) ---------- */
  'vocabImage.a11y': 'Image de {{word}}',

  /* ---------- Clés d’API (api-keys-card, débogage) ---------- */
  'apikeys.title': 'Clés d’API (débogage)',
  'apikeys.body':
    'Trois champs pour le flux de contenu : choisir un fournisseur, saisir la clé, enregistrer. Le choix vaut pour les groupes de générateurs concernés ; dans le studio web tu peux continuer à choisir différemment à chaque exécution.',
  'apikeys.labelText': '1 · Texte',
  'apikeys.labelAudio': '2 · Audio',
  'apikeys.labelImages': '3 · Images',
  'apikeys.textHint':
    'Produit des textes de vocabulaire, des phrases et des situations de conversation (groupes de générateurs « situations de conversation » et « contenus d’examen »).',
  'apikeys.audioHint':
    'Met en audio le vocabulaire, les phrases et les dialogues d’exercice. Après chaque clip, la vérification de hauteur tourne automatiquement ; les clips refusés ne sont pas enregistrés.',
  'apikeys.imagesHint': 'Produit les images du vocabulaire.',
  'apikeys.providerSet': '{{capability}} : fournisseur {{provider}} défini pour {{count}} groupe(s).',
  'apikeys.keySaved': '{{capability}} : clé pour {{provider}} enregistrée.',
  'apikeys.keyCleared': '{{capability}} : clé pour {{provider}} supprimée.',
  'apikeys.emptyField': 'Le champ est vide — utilise « {{action}} » pour retirer une clé.',
  'apikeys.badKey': 'Cela ne ressemble pas à une clé : au moins 20 caractères, sans espaces.',
  'apikeys.storedPlaceholder': 'enregistrée — ressaisir pour remplacer',
  'apikeys.save': 'Enregistrer la clé',
  'apikeys.delete': 'Supprimer',
  'apikeys.modeSecure':
    'Les clés sont stockées chiffrées sur cet appareil (Keychain/Keystore) et survivent aux redémarrages. Elles ne sont jamais livrées avec l’application.',
  'apikeys.modeSession':
    'Cet environnement n’a pas de stockage sûr — les clés ne restent en mémoire que pour cette session et disparaissent au rechargement. C’est voulu (AE-10).',
  'apikeys.modeChecking': 'Vérification du stockage …',

  /* ---------- Carte de générateur (generator-card, débogage) ---------- */
  'generator.badKey': 'Cela ne ressemble pas à une clé (trop courte ou avec des espaces).',
  'generator.keySaved': 'Clé appliquée.',
  'generator.keyCleared': 'Clé supprimée.',
  'generator.needKey': 'Saisis d’abord une clé d’API.',
  'generator.deleted': 'Stock supprimé.',
  'generator.language': 'Langue',
  'generator.languageFor': 'Langue pour {{what}}',
  'generator.languageNote':
    'La production se fait toujours pour exactement une langue. Ce qui a déjà été produit reste — une deuxième exécution pour une autre langue n’enlève rien.',
  'generator.provider': 'Fournisseur',
  'generator.providerFor': 'Fournisseur pour {{what}}',
  'generator.keySource': '{{label}} : clé de {{source}}.',
  'generator.keySourceVia': '{{label}} vient de {{vendor}} ; clé de {{source}}.',
  'generator.providersAudio':
    'Seuls les fournisseurs avec sortie vocale sont proposés — Claude et Stability AI n’en ont pas.',
  'generator.providersImages':
    'Seuls les fournisseurs qui produisent des images sont proposés — Claude ne produit pas d’images, Stability AI pas de texte.',
  'generator.providersText':
    'Seuls les fournisseurs qui produisent du texte sont proposés — Claude ne produit pas d’images, Stability AI pas de texte.',
  'generator.model': 'Modèle',
  'generator.modelFor': 'Nom du modèle pour {{what}}',
  'generator.modelNote':
    'Texte libre, volontairement non vérifié : les noms de modèles changent trop souvent pour les figer dans l’application. Laisse vide pour prendre « {{placeholder}} ». {{geminiNote}}',
  'generator.modelNoteGemini':
    'Avec Gemini, une coquille dans le nom est indiscernable d’une mauvaise clé — l’API signale les deux par « API key not valid » (mesuré, AE-26).',
  'generator.voice': 'Voix',
  'generator.genderFor': 'Timbre pour {{what}}',
  'generator.female': 'Féminine',
  'generator.male': 'Masculine',
  'generator.genderGoogle':
    'Google n’indique pas le genre de ses voix sur la page Gemini, mais dans la table « Voice options » de la documentation Cloud Text-to-Speech — les mêmes trente noms, consultés le {{date}}. Les boutons posent une voix documentée de ce timbre ; le champ en dessous accepte toutes les autres.',
  'generator.genderUnknown':
    '{{vendor}} ne donne aucune indication sur le genre de ses voix (consulté le {{date}}). Un choix « féminin/masculin » serait ici une conjecture, c’est pourquoi il n’y a que les noms.',
  'generator.voiceFor': 'Voix pour {{what}}',
  'generator.voiceChosen': '{{voice}} : {{description}}.',
  'generator.voiceEmpty': 'Laisse vide pour prendre « {{placeholder}} ».',
  'generator.voiceSynthetic':
    'Toutes les voix sont synthétiques, aucun enregistrement de locuteur natif — celle qui atteint les tons thaï a été mesurée (AE-31), pas promise.',
  'generator.keyFor': 'Clé d’API pour {{vendor}}',
  'generator.storedPlaceholder': 'enregistrée — ressaisir pour remplacer',
  'generator.modeSecure':
    'Stockée chiffrée sur l’appareil (Keychain/Keystore) et survit aux redémarrages. Chaque fournisseur a sa propre place — changer ici ne supprime aucune autre clé.',
  'generator.modeSession':
    'Le navigateur n’a pas de stockage sûr — la clé ne reste en mémoire que pour cette session et disparaît au rechargement. C’est voulu (AE-10).',
  'generator.saveKey': 'Appliquer la clé',
  'generator.delete': 'Supprimer',
  'generator.scope': 'Volume',
  'generator.scopeFor': 'Volume pour {{what}}',
  'generator.stop': 'Arrêter',
  'generator.start': 'Démarrer',
  'generator.estimateTitle': '{{count}} appels au fournisseur · {{provider}} · {{model}}',
  'generator.deliveryTitle': 'Aperçu de livraison pour {{total}} clips prévus',
  'generator.deliveryStats':
    '{{toneCheckable}} clips thaï vérifiables tonalement · {{technicalOnly}} clips seulement vérifiables techniquement · {{unchecked}} clips thaï livrés sans vérification · {{excluded}} exclus',
  'generator.deliveryNote':
    'Au plus {{passable}} des {{total}} clips ({{percent}} %) peuvent passer. Le taux de passage réel ne sera connu qu’après la vérification tonale et d’intégrité ; il peut être plus bas. Les coûts s’appliquent aux générations manquantes, y compris les clips exclus plus tard.',
  'generator.costInputA11y': 'Coût total estimé en USD',
  'generator.costPlaceholder': 'Estimation totale USD',
  'generator.cost': 'Coût estimé : {{usd}} USD',
  'generator.confirmCost': 'Confirmer le coût et démarrer l’exécution',
  'generator.showErrors': 'Afficher {{count}} échecs',
  'generator.confirmDelete': 'Vraiment tout supprimer ?',
  'generator.progress': '{{processed}} / {{total}}{{status}}',
  'generator.progressHalted': ' — arrêté',
  'generator.progressDone': ' — terminé',
  'generator.countOk': 'Produit',
  'generator.countFailed': 'Échoué',
  'generator.countSkipped': 'Ignoré',
  'generator.tonePassed': 'Ton réussi',
  'generator.toneRejected': 'Ton refusé',
  'generator.toneUnchecked': 'Ton non vérifié',
  'generator.current': 'en cours : {{item}}',
};

export default fr;
