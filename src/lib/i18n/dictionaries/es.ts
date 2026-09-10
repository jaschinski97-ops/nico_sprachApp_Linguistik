import type { TranslationKey } from '../keys';

/**
 * Español — traducción completa del conjunto de referencia alemán.
 * Las claves que falten vuelven al alemán y el test de integridad las indica.
 */
const es: Partial<Record<TranslationKey, string>> = {
  'common.retry': 'Inténtalo de nuevo',
  'common.recheck': 'Comprobar de nuevo',
  'common.loadFailed': 'No se pudo cargar: {{message}}',
  'common.languageLabel': 'Idioma',
  'common.switchLanguageA11y': 'Cambiar idioma',
  'common.learnGoal': 'Aprender {{language}}',
  'common.unknownError': 'Error desconocido.',

  'tabs.overview': 'Resumen',
  'tabs.learn': 'Aprender',
  'tabs.conversation': 'Conversación',
  'tabs.exam': 'Examen',
  'tabs.progress': 'Progreso',
  'tabs.settings': 'Ajustes',
  'tabs.brand': 'Compañero de aprendizaje',
  'tabs.mainNavA11y': 'Navegación principal',

  'home.subtitle': '¿Qué idioma aprendes hoy?',
  'home.systemLanguage': 'Idioma del sistema: {{language}}',
  'home.heroCta': 'Seguir aprendiendo',
  'home.dueBadge': '{{count}} pendientes',
  'home.nothingDue': 'Nada pendiente hoy',
  'home.sectionLanguages': 'Idiomas',
  'home.sectionDirections': 'Direcciones · {{language}}',
  'home.vocabCount': '{{count}} vocablos',

  'picker.hubNote': 'El alemán siempre es un lado — se aprende en ambas direcciones.',
  'picker.chooseA11y': 'Elegir idioma',
  'picker.vocabAndFeature': '{{count}} vocablos · Rasgo: {{feature}}',
  'picker.empty': 'Aún sin contenido.',
  'picker.emptyFeature': 'Rasgo decidido: {{feature}}{{kindNote}}.',
  'picker.kindDerivable': ' — se deduce de la escritura',
  'picker.kindPerWord': ' — hay que guardarlo palabra por palabra',

  'dashboard.title': 'Tarjetas pendientes',
  'dashboard.loading': 'Cargando estado de tarjetas …',
  'dashboard.learnA11y': 'Aprender {{direction}}, {{count}} tarjetas pendientes',
  'dashboard.dueOne': 'tarjeta pendiente',
  'dashboard.dueMany': 'tarjetas pendientes',
  'dashboard.totals': '{{total}} tarjetas en total · {{fresh}} nuevas · {{mastered}} dominadas',
  'dashboard.cta': 'Practicar {{direction}}',

  'legend.toneTitle': 'Colores tonales',
  'legend.toneBody':
    'Los cinco tonos tailandeses. En palabras de varias sílabas cada sílaba lleva su propio tono — por eso los colores están en la transcripción, sílaba a sílaba.',
  'tone.mid': 'Medio',
  'tone.low': 'Bajo',
  'tone.falling': 'Descendente',
  'tone.high': 'Alto',
  'tone.rising': 'Ascendente',
  'legend.stressTitle': 'Acentuación',
  'legend.stressBody':
    'La sílaba tónica se lee en la escritura — dos reglas y una excepción. Quien las conoce no necesita consultar la acentuación de ninguna palabra nueva.',
  'legend.stressRulePenultimate': 'Termina en vocal, «n» o «s»',
  'legend.stressRuleFinal': 'Termina en otra consonante',
  'legend.stressRuleAcute': 'Hay una tilde escrita',
  'legend.stressDetailPenultimate': 'penúltima sílaba',
  'legend.stressDetailFinal': 'última sílaba',
  'legend.stressDetailAcute': 'justo ahí — la regla queda sin efecto',
  'legend.stressAcuteNote':
    'Una tilde en «í» o «ú» hace algo más: separa dos vocales que de otro modo formarían una sílaba — por eso «día» tiene dos.',
  'legend.spellingTitle': 'Pronunciación',
  'legend.spellingBody':
    'A diferencia del tailandés y del español, aquí no hay regla: la misma secuencia de letras suena distinta de palabra a palabra. No es un defecto de esta app, sino el hallazgo — hay que conocerlo palabra por palabra.',
  'feature.tones': 'Tonos',
  'feature.stress': 'Acentuación',
  'feature.pronunciation': 'Pronunciación',
  'feature.gender': 'Género',

  'flashcard.listenA11y': 'Escuchar {{language}}',
  'flashcard.listenGermanA11y': 'Escuchar alemán',
  'flashcard.listenExampleA11y': 'Escuchar frase de ejemplo',
  'flashcard.plural': 'Plural: {{plural}}',

  'review.subtitle': 'Dirección de aprendizaje',
  'review.loadingProfile': 'Cargando perfil de aprendizaje …',
  'review.pickSubtitle': '{{language}} — ¿qué dirección quieres practicar?',
  'review.switch': '← Cambiar idioma o dirección',
  'review.switchA11y': 'Cambiar idioma o dirección de aprendizaje',
  'mode.cards': 'Tarjetas',
  'mode.speaking': 'Hablar',
  'mode.writing': 'Escribir',
  'mode.shadowing': 'Shadowing',
  'mode.sentenceRepeat': 'Repetir frase',
  'mode.sentenceListening': 'Entender frase',
  'mode.dictation': 'Dictado',
  'drill.tone': 'Oír tonos',
  'drill.toneRule': 'Deducir el tono',
  'drill.article': 'Artículos',
  'drill.verbForms': 'Formas verbales',
  'drill.stressRule': 'Deducir la tilde',
  'drill.spelling': 'Misma escritura, otro sonido',
  'drill.stressHear': 'Oír la acentuación',
  'drill.soundSpelling': 'Oír la palabra',
  'skill.wortschatz': 'Vocabulario',
  'skill.hoeren': 'Escuchar',
  'skill.lesen': 'Leer',
  'skill.sprechen': 'Hablar',
  'skill.schreiben': 'Escribir',
  'skill.grammatik': 'Gramática alemana',
  'cards.loadFailedTitle': 'No se pudo cargar la sesión',
  'cards.assembleFailed': 'No se pudo componer: {{message}}',
  'cards.assembling': 'Componiendo la sesión …',
  'cards.done': 'Sesión terminada',
  'cards.nothingDue': 'Nada pendiente',
  'cards.summaryRated': '{{rated}} tarjetas valoradas, {{again}} con «Otra vez».',
  'cards.summaryIdle':
    'Ahora mismo no hay tarjetas pendientes en esta dirección. Los ejercicios de arriba funcionan igual — no dependen de la pendiencia.',
  'cards.progress': 'Tarjeta {{index}} de {{total}}',
  'rating.again': 'Otra vez',
  'rating.hard': 'Difícil',
  'rating.good': 'Bien',
  'rating.easy': 'Fácil',
  'rating.a11y': 'Valoración {{label}}',
  'card.reveal': 'Mostrar',
  'card.revealA11y': 'Mostrar la respuesta',

  'conversation.subtitle': 'Situaciones lingüísticas preproducidas',
  'conversation.loading': 'Cargando situaciones …',
  'conversation.subtitleLanguage': 'Situaciones lingüísticas preproducidas · {{language}}',
  'conversation.subtitleCount': '{{count}} situaciones — sin conexión',
  'conversation.noneFor': 'Aún no hay situaciones para {{language}}',
  'conversation.noneForBody':
    'Esta versión de la app aún no contiene diálogos para {{language}}. Tarjetas y ejercicios están en «Aprender». Más contenido llega con las actualizaciones.',
  'conversation.noneForDirection':
    'Esta versión de la app aún no contiene diálogos para esta dirección.',
  'conversation.variant': ' · Variante {{count}}',
  'conversation.you': 'Tú',
  'conversation.partner': 'Interlocutor',
  'conversation.mistakesTitle': 'Errores típicos',
  'conversation.aiVoice': 'Voz de IA',
  'conversation.listenA11y': 'Escuchar: {{text}}',
  'conversation.syntheticNote': ' (voz sintética, sin grabación de hablante nativo)',
  'conversation.topicCount': '{{count}} diálogos',
  'topic.greeting': 'Saludos y presentaciones',
  'topic.market': 'Mercado y compras',
  'topic.restaurant': 'Restaurante y comida',
  'topic.travel': 'En camino',

  'exam.subtitle': 'Preparación para los certificados Goethe',
  'exam.subtitleModule': 'Módulo',
  'exam.moduleLoadFailed': 'No se pudo cargar el módulo',
  'exam.partsAsModules': 'Cuatro módulos que se presentan por separado o en combinación.',
  'exam.partsTogether': 'Cuatro partes del examen que se presentan juntas.',
  'exam.recommendation':
    'Recomendado a partir de {{age}} años; hasta este nivel el Goethe-Institut calcula {{units}} unidades didácticas de 45 minutos.',
  'exam.approxPrefix': 'unos ',
  'exam.minutes': '{{minutes}} minutos',
  'exam.formatGroup': ' · Examen en grupo',
  'exam.formatPair': ' · Examen en pareja',
  'exam.retrievedPrefix': 'Estructura oficial del examen, consultada el {{date}} — fuente: ',
  'exam.retrievedSuffix': '',
  'exam.loading': 'Cargando tareas …',
  'exam.filterAll': 'Todas',
  'exam.noModules':
    'Para {{level}} aún no hay tareas. Más tareas llegan con las actualizaciones de la app.',
  'exam.moduleMinutes': 'unos {{minutes}} min',
  'exam.aboutTitle': 'Qué es esto — y qué no es',
  'exam.aboutBody':
    'La estructura de arriba procede del Goethe-Institut. Las tareas, en cambio, están escritas por nosotros: no son tareas originales ni modelos del Goethe-Institut. Modelos auténticos y material de práctica están en el propio Goethe-Institut.',
  'exam.aboutGermanOnly':
    'El Goethe-Institut certifica alemán. Por eso este módulo va dirigido a todo el que aprende alemán — su idioma sea tailandés, inglés o español. Para la dirección contraria (alemán → tailandés) hay un pequeño inicio A1 según el esqueleto Goethe — es práctica, no un examen oficial.',

  'progress.subtitle': 'Historial de aprendizaje',
  'progress.subtitleLanguage': 'Historial de aprendizaje · {{language}}',
  'progress.loading': 'Cargando estado de aprendizaje …',
  'tile.reviewsToday': 'Repasos de hoy',
  'tile.drillsToday': 'Ejercicios de hoy',
  'tile.drillsHint': 'Ejercicios',
  'tile.streak': 'Días seguidos',
  'tile.dayOne': 'día',
  'tile.dayMany': 'días',
  'tile.started': 'Empezadas',
  'tile.mastered': 'Dominadas',
  'chart.perDay': 'Por día',
  'chart.legendReviews': 'Repasos',
  'chart.legendDrills': 'Ejercicios',
  'chart.columnA11y': '{{date}}: {{reviews}} repasos, {{drills}} ejercicios',
  'chart.loggedSinceWithDrills':
    'Registrado desde el {{since}} — repasos: {{reviews}} · ejercicios: {{drills}} ({{correct}} correctos). Faltan las sesiones anteriores: el registro diario existe solo desde esta versión.',
  'chart.loggedSince':
    'Registrado desde el {{since}} — repasos: {{reviews}}. Faltan las sesiones anteriores: el registro diario existe solo desde esta versión.',
  'chart.empty':
    'Aún no hay repasos registrados. El historial empieza con la primera tarjeta valorada; las sesiones anteriores no constan.',
  'state.new': 'Nueva',
  'state.learning': 'Aprendiendo',
  'state.review': 'Asentada',
  'state.mastered': 'Dominada',
  'states.title': 'Estado de las tarjetas',
  'states.empty':
    'Aún no hay tarjetas valoradas. En cuanto valores la primera en «Aprender», aquí se verá cómo se reparten.',
  'states.distributionA11y': 'Distribución de las tarjetas empezadas: {{parts}}',
  'states.masteredNote':
    '«Dominada» significa: la estabilidad calculada supera los 21 días.',
  'states.allStarted': 'Todas las tarjetas de este idioma están empezadas.',
  'states.notStarted': 'Sin empezar: {{count}} de {{total}} tarjetas.',

  'settings.back': 'Volver a ajustes',
  'settings.backupTitle': 'Copia de seguridad',
  'settings.backupSummary': 'Guardar y restaurar tu progreso',
  'settings.about': 'Acerca de la app',
  'settings.version': 'Versión {{version}}',
  'settings.studio': 'Estudio de desarrollo',
  'settings.studioSummary': 'Contenido, proveedores e informes',
  'settings.local': 'Guardado en este dispositivo',
  'settings.storageBody': 'El progreso de aprendizaje y los ajustes viven en este dispositivo. La copia de seguridad en los ajustes es una copia para cambiar de dispositivo.',
  'settings.general': 'General',
  'settings.development': 'Desarrollo',
  'settings.studioDevOnly': 'El estudio de desarrollador pertenece solo a la compilación de desarrollo; no forma parte de la app instalada.',
  'settings.studioOrigin': 'Esta ventana está fuera del puerto del estudio. Abre la compilación de desarrollo en localhost:8081 para generar contenido.',
  'settings.materialTitle': 'Tu material de aprendizaje',
  'settings.materialCount': '{{count}} palabras · tailandés, inglés y español',
  'settings.materialBody':
    'El material de aprendizaje forma parte de la app. Palabras, diálogos y ejercicios nuevos llegan con las actualizaciones. Tu progreso se queda en este dispositivo.',
  'settings.warningTitle': 'El progreso solo se guarda hasta cerrar la app',
  'settings.warningBody':
    'El almacenamiento permanente de este dispositivo no se pudo abrir. Todo lo que aprendas ahora se perderá al cerrar la app. Guarda tu progreso abajo como archivo mientras exista.',
  'appLanguage.title': 'Idioma de la app',
  'appLanguage.body': 'La app arranca en el idioma de tu dispositivo. Aquí puedes fijarlo.',
  'appLanguage.system': 'Sistema',
  'backup.body':
    'Guarda tu progreso como archivo — por ejemplo antes de cambiar de dispositivo o reinstalar. Puedes restaurar esa copia aquí; sustituye entonces el historial de este dispositivo.',
  'backup.exportA11y': 'Guardar el historial como archivo',
  'backup.importA11y': 'Leer la copia y reemplazar el historial',
  'backup.exportButton': 'Guardar historial',
  'backup.exporting': 'Guardando copia …',
  'backup.importButton': 'Restaurar copia',
  'backup.importing': 'Leyendo copia …',
  'backup.created': 'Copia creada: {{fileName}}',
  'backup.failed': 'Esto es lo que falló: {{message}}',
  'backup.applied': 'Importado: {{parts}}.',
  'backup.fromDate': ' (copia del {{date}}.)',
  'backup.partsCards': '{{cards}} tarjetas',
  'backup.partsLog': '{{days}} días de registro',
  'backup.partsProfile': 'Perfil de aprendizaje',
  'backup.confirmTitle': '¿Reemplazar el historial?',
  'backup.confirmQuestion':
    'La copia reemplazará todo tu historial de aprendizaje en este dispositivo. ¿Hacer este paso?',
  'backup.confirmCancel': 'Cancelar',
  'backup.confirmReplace': 'Reemplazar',

  /* ---------- Piezas comunes de los runners de ejercicios ---------- */
  'common.back': 'Volver',
  'common.next': 'Siguiente',
  'common.cancel': 'Cancelar',
  'common.failed': 'Eso falló: {{message}}',

  /* ---------- Ejercicios (drill-runner; textos de ronda compartidos) ---------- */
  'drill.loadFailedTitle': 'No se pudo cargar el ejercicio',
  'drill.assembling': 'Se está preparando el ejercicio …',
  'drill.noVocab': 'No hay vocabulario adecuado',
  'drill.toneEmpty':
    'Para este quiz de escucha aún no hay grabaciones de pronunciación verificadas. Los clips sin verificar y las voces de ordenador no se usan a propósito — mejor practica con uno de los otros ejercicios.',
  'drill.noneFor': 'Para „{{drill}}“ no hay ahora entradas adecuadas en el fondo básico.',
  'drill.roundDone': 'Ronda terminada',
  'drill.roundScore': '{{correct}} de {{total}} correctas.',
  'drill.newRound': 'Nueva ronda',
  'drill.questionProgress': 'Tarea {{index}} de {{total}}',
  'drill.exit': 'Salir del ejercicio',
  'drill.playAgain': '🔊 Volver a escuchar',
  'drill.playAgainA11y': 'Volver a escuchar la palabra',
  'drill.voiceMissing': 'Este ejemplo de audio no está disponible. Puedes seguir practicando en „{{skill}}“.',
  'drill.correct': '✓ Correcto',
  'drill.wrong': '✗ No del todo',
  'drill.exact': '✓ Exactamente correcto',
  'drill.derivationA11y': 'Deducción del tono',
  'drill.mistakesTitle': 'Esto aún no salió bien:',
  'drill.prompt.tone': '¿Qué tono oyes?',
  'drill.prompt.toneRule': '¿Qué tono tiene esta palabra?',
  'drill.prompt.article': '¿Qué artículo corresponde a la palabra?',
  'drill.prompt.verbForms': '¿Cómo es el perfecto?',
  'drill.prompt.stressRule': '¿Qué sílaba lleva el acento?',
  'drill.prompt.spelling': '¿Cómo suena esta grafía aquí?',
  'drill.prompt.stressHear': '¿Qué sílaba oyes acentuada?',
  'drill.prompt.soundSpelling': '¿Qué palabra oyes?',

  /* ---------- Tarea de examen (exam-runner) ---------- */
  'exam.taskMultipleChoice': 'Opción múltiple (A/B/C)',
  'exam.taskTrueFalse': 'Verdadero o falso',
  'exam.taskMatching': 'Emparejamiento',
  'exam.taskGapFill': 'Rellenar huecos',
  'exam.taskProduction': 'Producción libre',
  'exam.backA11y': 'Volver a la vista general de tareas',
  'exam.back': 'Volver a la vista general',
  'exam.score': '{{correct}} de {{total}} correctas',
  'exam.noPassMark':
    'Esto es una tarea de práctica, no un examen — aquí no hay deliberadamente una nota mínima, porque no se tomó de la fuente.',
  'exam.check': 'Evaluar',
  'exam.checkDisabled': 'Por favor, responde todas las tareas',
  'exam.listen': 'Escuchar el texto',
  'exam.audioNote':
    'El texto se lee en voz alta. Puede escucharlo tantas veces como quiera; leerlo solo es posible tras la evaluación.',
  'exam.productionNote':
    'Esta tarea no se evalúa automáticamente — la app no puede juzgar con fiabilidad textos libres ni respuestas habladas. Escribe o habla tú primero y compara después con la solución modelo.',
  'exam.modelAnswerTitle': 'Solución modelo',
  'exam.listenModel': 'Escuchar la solución modelo',
  'exam.selfCheck': 'Autocontrol',
  'exam.showModel': 'Mostrar la solución modelo',

  /* ---------- Escritura libre (writing-runner) ---------- */
  'writing.promptDe': '¿Cómo se llama esto en alemán? Con artículo, si lo hay.',
  'writing.promptTh': '¿Cómo se escribe esto en tailandés? Con signos tonales.',
  'writing.promptEs': '¿Cómo se escribe esto en español? Con tildes.',
  'writing.promptEn': '¿Cómo se escribe esto en inglés?',
  'writing.assembling': 'Se está preparando la ronda …',
  'writing.noneForDirection': 'Para esta dirección todavía no hay vocabulario con forma objetivo tecleable.',
  'writing.summary': '{{correct}} de {{total}} correctas, {{exact}} de ellas sin erratas.',
  'writing.countsAsReview':
    'Esta ronda cuenta como repetición: a diferencia de los ejercicios de elección, la escritura libre actualiza el estado de la tarjeta (AE-40).',
  'writing.inputA11y': 'Introducir la respuesta',
  'writing.checkA11y': 'Comprobar la respuesta',
  'writing.check': 'Tarea {{index}} de {{total}}',
  'writing.taskOf': 'Tarea {{index}} de {{total}}',

  /* ---------- Nota de valoración (writing-runner, dictation-runner) ---------- */
  'rating.ratedAs': 'Valorado como „{{rating}}“. {{explanation}}',

  /* ---------- Ejercicio de expresión oral (speaking-runner) ---------- */
  'speaking.noticeClip': 'Clip de IA reproducido — solo ejemplo de escucha, nunca referencia de evaluación.',
  'speaking.noticeTts': 'Voz del dispositivo reproducida — solo ejemplo de escucha, nunca referencia de evaluación.',
  'speaking.noticeNone': 'En este dispositivo no hay ningún ejemplo de escucha disponible.',
  'speaking.noticeError':
    'No se pudo reproducir el ejemplo de escucha. La grabación funciona con independencia de ello.',
  'speaking.loadFailedTitle': 'No se pudo cargar el ejercicio de expresión oral',
  'speaking.assembling': 'Se está preparando el ejercicio de expresión oral …',
  'speaking.noTarget': 'Ninguna curva objetivo adecuada',
  'speaking.noTargetBody':
    'El ejercicio usa solo palabras tailandesas monosilábicas verificadas en la fuente. Así no se adivina ninguna frontera silábica.',
  'speaking.roundSummaryOne':
    '{{count}} curva tonal evaluada localmente. No hay puntuación a propósito: lo medido no es la pronunciación completa.',
  'speaking.roundSummaryMany':
    '{{count}} curvas tonales evaluadas localmente. No hay puntuación a propósito: lo medido no es la pronunciación completa.',
  'speaking.progress': 'Palabra {{index}} de {{total}}',
  'speaking.exitA11y': 'Salir del ejercicio de expresión oral',
  'speaking.sayThisWord': 'Di esta palabra',
  'speaking.playExample': 'Ejemplo de escucha sintético',
  'speaking.clipNote':
    'El clip solo sirve para escuchar. La evaluación no compara tu grabación con esta voz.',
  'speaking.privacyTitle': 'Micrófono y privacidad',
  'speaking.scopedNote':
    'Solo se evalúa la curva tonal — no las consonantes, la duración vocálica, la aspiración ni la pronunciación completa; por eso no hay puntuación.',
  'speaking.permissionNote':
    'Si falta el permiso, la consulta del sistema aparece solo al elegir „{{action}}“. Como mucho, tras cuatro segundos la grabación se detiene automáticamente.',
  'speaking.stop': 'Detener y evaluar localmente',
  'speaking.requestingPermission': 'Solicitando permiso de micrófono …',
  'speaking.evaluating': 'Evaluando localmente …',
  'speaking.start': 'Iniciar la grabación',
  'speaking.discard': 'Descartar',
  'speaking.recording': '● Grabando · {{seconds}} s',
  'speaking.retry': 'Grabar otra vez',
  'speaking.nextWord': 'Palabra siguiente',
  'speaking.noFsrs': 'Esta medición parcial no modifica tu caja de tarjetas FSRS.',
  'speaking.targetForm': 'Forma objetivo: {{tone}}',
  'speaking.source':
    'Fuente: tono silábico verificado en la fuente a partir del IPA de Wiktionary{{link}}. No procede de TTS ni de un clip.',
  'speaking.sourceLink': ' · enlace a la fuente en la entrada de vocabulario',
  'speaking.verdictCompatible': 'Curva compatible',
  'speaking.verdictNeedsWork': 'Curva aún no compatible',
  'speaking.verdictRegister': 'Curva medida – registro incierto',
  'speaking.verdictUnreliable': 'No medible con fiabilidad',
  'speaking.curveNote':
    'Curva medida: semitonos relativos; la línea discontinua es la mediana de esta grabación.',
  'speaking.measuredLine':
    'Tramo sonoro evaluado: {{duration}} ms · grabación: {{seconds}} s{{limit}}',
  'speaking.autoStopped': ' · detenida automáticamente',
  'speaking.limitationsTitle': 'Lo que esta retroalimentación no evalúa',

  /* ---------- Dictado (dictation-runner) ---------- */
  'dictation.promptTh': 'Escribe la frase que oyes — con signos tonales.',
  'dictation.promptDe': 'Escribe la frase que oyes — con mayúsculas y minúsculas.',
  'dictation.promptEs': 'Escribe la frase que oyes — con tildes.',
  'dictation.promptEn': 'Escribe la frase que oyes.',
  'dictation.noVoice':
    'Ningún clip de frases y ninguna voz del sistema en {{language}} disponibles. Instala una voz de {{language}} o usa un dispositivo con salida de voz en {{language}}.',
  'dictation.slowClipOnly':
    'Solo un clip de frases incluido se puede ralentizar — la voz del sistema se reproduce a velocidad normal.',
  'dictation.slowUnsupported':
    'Ralentizar no está admitido en este dispositivo — velocidad normal.',
  'dictation.noneFor': 'Todavía no hay material de dictado para {{language}}',
  'dictation.summary': '{{correct}} de {{total}} superadas, {{exact}} de ellas sin errores.',
  'dictation.onlyPassedRate':
    'Solo los dictados superados han hecho avanzar el plan de repetición del vocabulario correspondiente.',
  'dictation.newRoundA11y': 'Nueva ronda de dictado',
  'dictation.progress': 'Dictado {{index}} de {{total}}',
  'dictation.exit': 'Salir del dictado',
  'dictation.play': 'Escuchar la frase',
  'dictation.playSlowA11y': 'Escuchar la frase ralentizada',
  'dictation.slow': 'Lento',
  'dictation.relistenNote': 'Escuchar varias veces está expresamente permitido — también tras „{{action}}“.',
  'dictation.inputA11y': 'Introducir el dictado',
  'dictation.check': 'Comprobar',
  'dictation.checkA11y': 'Comprobar el dictado',
  'dictation.passed': '✓ Superado',
  'dictation.failed': '✗ Aún no superado',
  'dictation.baseScore': 'Ortografía base {{base}} %{{tonePart}}',
  'dictation.toneScorePart': ' · tonos y diacríticos {{score}} %',
  'dictation.tooMuch': 'Tecleado de más: {{tokens}}',
  'dictation.notRated':
    'No superado — el plan de repetición del vocabulario no cambia. Solo los dictados superados cuentan como repetición.',

  /* ---------- Ejercicios de frases (sentence-runner) ---------- */
  'sentence.interrupted': 'Interrumpido. La grabación se descartó; prepara la frase de nuevo.',
  'sentence.noVoice':
    'No hay clip de frases ni voz del sistema en {{language}}. Instala una voz de {{language}} o usa un dispositivo con salida de voz en {{language}}. Sin frase audible no se evalúa ninguna respuesta.',
  'sentence.playFailed': 'La reproducción de la frase falló. Inténtalo de nuevo.',
  'sentence.measureFailed': 'No se pudo evaluar la grabación.',
  'sentence.modelFailed': 'El modelo no pudo iniciarse. La grabación se descartó.',
  'sentence.noneFor': 'Todavía no hay material de frases para {{language}}',
  'sentence.listeningSummary': '{{correct}} de {{total}} significados de frase elegidos correctamente.',
  'sentence.spokenSummary':
    '{{total}} frases trabajadas. Sin evaluación de pronunciación y sin cambios en el plan de repetición.',
  'sentence.progress': 'Frase {{index}} de {{total}}',
  'sentence.exit': 'Salir del ejercicio de frases',
  'sentence.titleShadowing': 'Habla junto con la frase',
  'sentence.titleRepeat': 'Repite la misma frase',
  'sentence.roundHint': 'Ronda {{round}} de 3 · 12 / 9 / 6 segundos.',
  'sentence.hintA11y': 'Contexto del ejercicio',
  'sentence.hintShow': '▼ Mostrar contexto',
  'sentence.hintHide': '▲ Ocultar contexto',
  'sentence.hintRepeat':
    'Proporción 4:3:2 adaptada a frases cortas, no un monólogo de 4/3/2 minutos. El efecto de oyentes que cambian y de una intención comunicativa real no se cubre aquí.',
  'sentence.hintShadowing':
    'Escucha primero la frase. Luego habla mientras suena el modelo. Usa auriculares: por altavoz el modelo puede colarse en la medición de tu micrófono.',
  'sentence.prepare': 'Preparación obligatoria · quedan {{seconds}} segundos',
  'sentence.prepareBody':
    'Aclara el significado y planifica la frase entera. {{focus}} Los 15 segundos son una decisión del ejercicio, no un óptimo científicamente determinado.',
  'sentence.listen': 'Escuchar la frase',
  'sentence.listenAgain': 'Escuchar la frase de nuevo',
  'sentence.exampleNote': 'El ejemplo de audio no es una referencia para tu grabación.',
  'sentence.headphones': 'Uso auriculares',
  'sentence.headphonesOk': 'Auriculares confirmados',
  'sentence.micNote':
    'Micrófono solo después de «{{action}}». Solo memoria volátil del dispositivo, sin subida. Como máximo {{seconds}} segundos; después la grabación se evalúa y se descarta.',
  'sentence.start': 'Iniciar grabación',
  'sentence.remaining': 'Quedan {{seconds}} segundos',
  'sentence.stop': 'Terminar grabación',
  'sentence.measurement': 'Medición local · {{seconds}} segundos de grabación',
  'sentence.voicedNote':
    'El {{percent}} % de las ventanas de análisis muestran periodicidad medible. No es una nota de tiempo de habla, ritmo ni fluidez.',
  'sentence.limitReached':
    'La ventana de tiempo ha terminado; no se detecta si la frase quedó completa.',
  'sentence.contourNote':
    'Solo el tramo de F0 contiguo más largo, {{duration}} ms. No hay comparación con un modelo para la frase; tonos de palabra, consonantes, duración vocálica, aspiración y completitud no se evalúan.',
  'sentence.noVoiced':
    'No hay tramo sonoro suficiente medible. Eso no significa que tu frase estuviera mal.',
  'sentence.reprepare': 'Preparar de nuevo',
  'sentence.nextWindow': 'Preparar la siguiente ventana de tiempo',
  'sentence.nextSentence': 'Siguiente frase',
  'sentence.questionPrompt': '¿Qué afirmación o pregunta completa has oído?',
  'sentence.correct': 'Correcto.',
  'sentence.meant': 'Lo que se decía: {{answer}}',

  /* ---------- Palabra con marca (term-word) ---------- */
  'term.stressed': 'acentuada: {{syllable}}',

  /* ---------- Insignia de fuente (verification-badge) ---------- */
  'verification.a11y': 'Mostrar nota sobre la situación de las fuentes',
  'verification.label': 'Significado no verificado en la fuente',
  'verification.noNote': 'No hay ninguna nota adicional.',

  /* ---------- Diagnóstico (diagnostics-card) ---------- */
  'diagnostics.title': 'Diagnóstico',
  'diagnostics.body':
    'Qué hay almacenado y dónde está almacenado. Sin importancia para el aprendizaje — útil cuando algo no se ve como se espera.',
  'diagnostics.tableA11y': 'Vocabulario por idioma',
  'diagnostics.row': '{{stored}} en almacenamiento · {{shipped}} incluidos · {{verified}} verificados en la fuente',
  'diagnostics.backends': 'Almacén de datos: {{data}} · almacén de imágenes: {{images}} · almacén de clips: {{clips}}',
  'diagnostics.loading': 'Cargando …',

  /* ---------- Curva tonal medida (measured-tone-contour) ---------- */
  'contour.measuredA11y': 'Curva tonal medida en semitonos relativos: {{points}}',

  /* ---------- Imagen de vocabulario (vocab-image) ---------- */
  'vocabImage.a11y': 'Imagen de {{word}}',

  /* ---------- Claves de API (api-keys-card, depuración) ---------- */
  'apikeys.title': 'Claves de API (depuración)',
  'apikeys.body':
    'Tres campos para el flujo de contenido: elegir proveedor, teclear la clave, guardar. La elección vale para los grupos de generador correspondientes; en el estudio web puedes seguir eligiendo distinto en cada ejecución.',
  'apikeys.labelText': '1 · Texto',
  'apikeys.labelAudio': '2 · Audio',
  'apikeys.labelImages': '3 · Imágenes',
  'apikeys.textHint':
    'Genera textos de vocabulario, frases y situaciones de conversación (grupos de generador „situaciones de conversación“ y „contenidos de examen“).',
  'apikeys.audioHint':
    'Pone voz a vocabulario, frases y diálogos de práctica. Tras cada clip se ejecuta automáticamente la comprobación tonal; los clips rechazados no se guardan.',
  'apikeys.imagesHint': 'Genera las imágenes del vocabulario.',
  'apikeys.providerSet': '{{capability}}: proveedor {{provider}} fijado para {{count}} grupo(s).',
  'apikeys.keySaved': '{{capability}}: clave de {{provider}} guardada.',
  'apikeys.keyCleared': '{{capability}}: clave de {{provider}} borrada.',
  'apikeys.emptyField': 'El campo está vacío — usa „{{action}}“ para quitar una clave.',
  'apikeys.badKey': 'Esto no parece una clave: al menos 20 caracteres, sin espacios.',
  'apikeys.storedPlaceholder': 'guardada — teclear de nuevo para reemplazar',
  'apikeys.save': 'Guardar clave',
  'apikeys.delete': 'Borrar',
  'apikeys.modeSecure':
    'Las claves se guardan cifradas en este dispositivo (Keychain/Keystore) y sobreviven a los reinicios. Nunca se distribuyen con la app.',
  'apikeys.modeSession':
    'Este entorno no tiene almacén seguro — las claves solo permanecen en memoria durante esta sesión y desaparecen al recargar. Es intencionado (AE-10).',
  'apikeys.modeChecking': 'Comprobando el almacén …',

  /* ---------- Tarjeta de generador (generator-card, depuración) ---------- */
  'generator.badKey': 'Esto no parece una clave (demasiado corta o con espacios).',
  'generator.keySaved': 'Clave aplicada.',
  'generator.keyCleared': 'Clave borrada.',
  'generator.needKey': 'Introduce antes una clave de API.',
  'generator.deleted': 'Contenido borrado.',
  'generator.language': 'Idioma',
  'generator.languageFor': 'Idioma para {{what}}',
  'generator.languageNote':
    'Siempre se produce para exactamente un idioma. Lo ya producido se queda — una segunda ejecución para otro idioma no quita nada.',
  'generator.provider': 'Proveedor',
  'generator.providerFor': 'Proveedor para {{what}}',
  'generator.keySource': '{{label}}: clave de {{source}}.',
  'generator.keySourceVia': '{{label}} viene de {{vendor}}; clave de {{source}}.',
  'generator.providersAudio':
    'Solo se pueden elegir proveedores con salida de voz — Claude y Stability AI no tienen.',
  'generator.providersImages':
    'Solo se pueden elegir proveedores que produzcan imágenes — Claude no produce imágenes, Stability AI no texto.',
  'generator.providersText':
    'Solo se pueden elegir proveedores que produzcan texto — Claude no produce imágenes, Stability AI no texto.',
  'generator.model': 'Modelo',
  'generator.modelFor': 'Nombre del modelo para {{what}}',
  'generator.modelNote':
    'Texto libre, deliberadamente sin comprobación: los nombres de modelo cambian demasiado a menudo para fijarlos en la app. Déjalo vacío para tomar „{{placeholder}}“. {{geminiNote}}',
  'generator.modelNoteGemini':
    'Con Gemini, una errata en el nombre no se distingue de la clave equivocada — la API informa de ambos como „API key not valid“ (medido, AE-26).',
  'generator.voice': 'Voz',
  'generator.genderFor': 'Timbre para {{what}}',
  'generator.female': 'Femenina',
  'generator.male': 'Masculina',
  'generator.genderGoogle':
    'Google no indica el género de sus voces en la página de Gemini, sino en la tabla „Voice options“ de la documentación de Cloud Text-to-Speech — los mismos treinta nombres, consultados el {{date}}. Los botones fijan una voz documentada de ese timbre; en el campo de abajo cabe cualquier otra.',
  'generator.genderUnknown':
    '{{vendor}} no da información sobre el género de sus voces (consultado el {{date}}). Una elección „femenina/masculina“ sería aquí un cálculo, por eso solo hay nombres.',
  'generator.voiceFor': 'Voz para {{what}}',
  'generator.voiceChosen': '{{voice}}: {{description}}.',
  'generator.voiceEmpty': 'Déjalo vacío para tomar „{{placeholder}}“.',
  'generator.voiceSynthetic':
    'Todas las voces son sintéticas, ninguna grabación de hablante nativo — cuál acierta los tonos tailandeses se midió (AE-31), no se prometió.',
  'generator.keyFor': 'Clave de API para {{vendor}}',
  'generator.storedPlaceholder': 'guardada — teclear de nuevo para reemplazar',
  'generator.modeSecure':
    'Se guarda cifrada en el dispositivo (Keychain/Keystore) y sobrevive a los reinicios. Cada proveedor tiene su propio lugar — cambiar aquí no borra otra clave.',
  'generator.modeSession':
    'El navegador no tiene almacén seguro — la clave solo permanece en memoria durante esta sesión y desaparece al recargar. Es intencionado (AE-10).',
  'generator.saveKey': 'Aplicar clave',
  'generator.delete': 'Borrar',
  'generator.scope': 'Volumen',
  'generator.scopeFor': 'Volumen para {{what}}',
  'generator.stop': 'Detener',
  'generator.start': 'Iniciar',
  'generator.estimateTitle': '{{count}} llamadas al proveedor · {{provider}} · {{model}}',
  'generator.deliveryTitle': 'Vista previa de entrega para {{total}} clips previstos',
  'generator.deliveryStats':
    '{{toneCheckable}} clips tailandeses verificables tonalmente · {{technicalOnly}} clips solo técnicamente verificables · {{unchecked}} clips tailandeses entregados sin verificar · {{excluded}} excluidos',
  'generator.deliveryNote':
    'Como mucho {{passable}} de {{total}} clips ({{percent}} %) pueden pasar. La tasa real de paso solo se conocerá tras la comprobación tonal y de integridad; puede ser menor. Los costes se aplican a las generaciones que faltan, también para clips excluidos más tarde.',
  'generator.costInputA11y': 'Coste total estimado en USD',
  'generator.costPlaceholder': 'Estimación total USD',
  'generator.cost': 'Coste estimado: {{usd}} USD',
  'generator.confirmCost': 'Confirmar coste e iniciar la ejecución',
  'generator.showErrors': 'Mostrar {{count}} fallos',
  'generator.confirmDelete': '¿Borrar realmente todo?',
  'generator.progress': '{{processed}} / {{total}}{{status}}',
  'generator.progressHalted': ' — detenido',
  'generator.progressDone': ' — terminado',
  'generator.countOk': 'Generado',
  'generator.countFailed': 'Fallido',
  'generator.countSkipped': 'Omitido',
  'generator.tonePassed': 'Tono superado',
  'generator.toneRejected': 'Tono rechazado',
  'generator.toneUnchecked': 'Tono sin verificar',
  'generator.current': 'actualmente: {{item}}',
};

export default es;
