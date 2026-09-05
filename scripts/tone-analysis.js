// Generated from src/lib/speaking/analysis.ts by scripts/build-tone-tool.cjs. Do not edit.
globalThis.ToneAnalysis = (() => { const exports = {};
"use strict";
/**
 * Lokale F0-Konturmessung fuer die Sprechuebung.
 *
 * Urspruenglich aus dem Messwerkzeug (Phase 11, AE-31) uebertragen;
 * `scripts/tone-contour.html` verwendet jetzt diesen gemeinsamen Kern.
 * 40-ms-Fenster, 10-ms-Schritt,
 * normierte Autokorrelation von 70 bis 400 Hz, Energie- und
 * Korrelationsschwelle, Medianfilter (3), laengste stimmhafte Strecke,
 * einmalige grobe Oktavkorrektur und 8 % Beschnitt an beiden Raendern.
 * Ohne sichere Vier-Fenster-Strecke erlaubt AE-58 eine eng begrenzte
 * Fortsetzung schwacher Periodizitaet; vorhandene sichere Strecken bleiben.
 *
 * Dieses Modul kennt weder Aufnahme-APIs noch TTS oder Netzwerkzugriffe. Es
 * bekommt ausschliesslich Mono-PCM und liefert Messwerte zurueck.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_F0_ANALYSIS_SAMPLE_RATE = exports.CONTOUR_EDGE_TRIM = exports.OCTAVE_RATIO = exports.F0_MIN_RELATIVE_RMS = exports.F0_MAX_STEP_SEMITONES = exports.F0_CONTINUATION_CORRELATION = exports.F0_MIN_CORRELATION = exports.F0_MAX_HZ = exports.F0_MIN_HZ = exports.F0_HOP_SECONDS = exports.F0_WINDOW_SECONDS = void 0;
exports.downsampleForF0 = downsampleForF0;
exports.autocorrF0 = autocorrF0;
exports.longestRun = longestRun;
exports.octaveCorrect = octaveCorrect;
exports.trimEdges = trimEdges;
exports.semitones = semitones;
exports.medianReferenceHz = medianReferenceHz;
exports.summarizeContour = summarizeContour;
exports.matchesTone = matchesTone;
exports.matchesToneShape = matchesToneShape;
exports.analyzeToneContour = analyzeToneContour;
exports.F0_WINDOW_SECONDS = 0.04;
exports.F0_HOP_SECONDS = 0.01;
exports.F0_MIN_HZ = 70;
exports.F0_MAX_HZ = 400;
exports.F0_MIN_CORRELATION = 0.6;
/** Weak frames may CONTINUE a confidently voiced track, never seed one. */
exports.F0_CONTINUATION_CORRELATION = 0.18;
exports.F0_MAX_STEP_SEMITONES = 2;
exports.F0_MIN_RELATIVE_RMS = 0.08;
exports.OCTAVE_RATIO = 1.8;
exports.CONTOUR_EDGE_TRIM = 0.08;
/**
 * Obergrenze nur fuer die Vorverarbeitung der App-Aufnahmen.
 *
 * Bei 48 kHz kostet die unveraenderte Autokorrelation pro Sekunde ueber
 * hundert Millionen innere Schleifendurchlaeufe. 8 kHz bildet den
 * ausgewerteten Bereich bis 400 Hz weiterhin deutlich ueber Nyquist ab und
 * senkt die Arbeit auf ungefaehr ein Sechsunddreissigstel.
 */
exports.MAX_F0_ANALYSIS_SAMPLE_RATE = 8_000;
/**
 * Senkt nur die Abtastrate vor dem unveraenderten F0-Kern.
 *
 * Es wird ein ganzzahliger Faktor gewaehlt und jeder Block gemittelt. Dadurch
 * bleibt die Dauer erhalten, ein 48-kHz-Puffer wird exakt zu 8 kHz, und
 * 44,1 kHz wird zu 7,35 kHz. Das Blockmittel wirkt zugleich als einfacher
 * Tiefpass gegen Aliasanteile. PCM mit bereits hoechstens 8 kHz bleibt bis
 * auf die notwendige Float32-Kopie unveraendert.
 */
function downsampleForF0(samples, sampleRate, maxSampleRate = exports.MAX_F0_ANALYSIS_SAMPLE_RATE) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
        throw new RangeError('sampleRate muss eine positive Zahl sein.');
    }
    if (!Number.isFinite(maxSampleRate) || maxSampleRate <= 0) {
        throw new RangeError('maxSampleRate muss eine positive Zahl sein.');
    }
    const downsampleFactor = Math.max(1, Math.ceil(sampleRate / maxSampleRate));
    const length = Math.floor(samples.length / downsampleFactor);
    const prepared = new Float32Array(length);
    for (let output = 0; output < length; output++) {
        let sum = 0;
        const start = output * downsampleFactor;
        for (let offset = 0; offset < downsampleFactor; offset++) {
            sum += samples[start + offset];
        }
        prepared[output] = sum / downsampleFactor;
    }
    return {
        samples: prepared,
        sampleRate: sampleRate / downsampleFactor,
        downsampleFactor,
    };
}
/**
 * F0 je Fenster ueber normierte Autokorrelation.
 *
 * Wie im Messwerkzeug wird vor der Korrelation zuerst das maximale RMS ueber
 * alle Fenster bestimmt. Der Medianfilter liest aus einer unveraenderten
 * Kopie der urspruenglichen F0-Werte, damit ein ersetzter Nachbar nicht die
 * naechste Ersetzung beeinflusst.
 */
function autocorrF0(samples, sampleRate, recoverWeakVoicing = true) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
        throw new RangeError('sampleRate muss eine positive Zahl sein.');
    }
    const win = Math.round(exports.F0_WINDOW_SECONDS * sampleRate);
    const hop = Math.round(exports.F0_HOP_SECONDS * sampleRate);
    const minLag = Math.floor(sampleRate / exports.F0_MAX_HZ);
    const maxLag = Math.ceil(sampleRate / exports.F0_MIN_HZ);
    const frames = [];
    let maxRms = 0;
    for (let start = 0; start + win + maxLag <= samples.length; start += hop) {
        let energy = 0;
        for (let i = 0; i < win; i++) {
            energy += samples[start + i] * samples[start + i];
        }
        const rms = Math.sqrt(energy / win);
        maxRms = Math.max(maxRms, rms);
        frames.push({ t: start / sampleRate, start, rms, f0: 0 });
    }
    const candidates = new Map();
    for (const frame of frames) {
        if (frame.rms < exports.F0_MIN_RELATIVE_RMS * maxRms)
            continue;
        let best = 0;
        let bestLag = 0;
        for (let lag = minLag; lag <= maxLag; lag++) {
            let numerator = 0;
            let d1 = 0;
            let d2 = 0;
            for (let i = 0; i < win; i++) {
                const a = samples[frame.start + i];
                const b = samples[frame.start + i + lag];
                numerator += a * b;
                d1 += a * a;
                d2 += b * b;
            }
            const correlation = numerator / (Math.sqrt(d1 * d2) || 1);
            if (correlation > best) {
                best = correlation;
                bestLag = lag;
            }
        }
        frame.correlation = best;
        if (best >= exports.F0_CONTINUATION_CORRELATION)
            candidates.set(frame, sampleRate / bestLag);
        if (best >= exports.F0_MIN_CORRELATION)
            frame.f0 = sampleRate / bestLag;
    }
    // Short dead syllables can lose periodicity while their F0 falls smoothly.
    // Hysteresis preserves that continuation without accepting a whole low-r
    // noise track. No gaps, octave jumps, or isolated weak runs are bridged.
    // A valid strict run wins. Extending every run polluted Niwat's otherwise
    // measurable contours in the AE-31 reproduction; recovery is a fallback
    // only for recordings that would otherwise have no four-frame run at all.
    if (recoverWeakVoicing && !longestRun(frames)) {
        for (const direction of [1, -1]) {
            for (let i = direction === 1 ? 1 : frames.length - 2; i >= 0 && i < frames.length; i += direction) {
                const frame = frames[i];
                const previous = frames[i - direction];
                const candidate = candidates.get(frame);
                if (!frame.f0 && previous?.f0 && candidate &&
                    Math.abs(semitones(candidate, previous.f0)) <= exports.F0_MAX_STEP_SEMITONES) {
                    frame.f0 = candidate;
                }
            }
        }
    }
    const originalF0 = frames.map((frame) => frame.f0);
    for (let i = 1; i < frames.length - 1; i++) {
        const trio = [originalF0[i - 1], originalF0[i], originalF0[i + 1]]
            .filter((value) => value > 0)
            .sort((a, b) => a - b);
        if (trio.length === 3)
            frames[i].f0 = trio[1];
    }
    return frames;
}
/** Laengste zusammenhaengende stimmhafte Strecke, mindestens vier Fenster. */
function longestRun(frames) {
    const runs = [];
    let current = [];
    for (const frame of frames) {
        if (frame.f0 > 0) {
            current.push(frame);
        }
        else {
            if (current.length)
                runs.push(current);
            current = [];
        }
    }
    if (current.length)
        runs.push(current);
    runs.sort((a, b) => b.length - a.length);
    return runs[0] && runs[0].length >= 4 ? runs[0] : null;
}
/**
 * Grobe Oktavkorrektur aus AE-31, bewusst nur ein Durchgang.
 *
 * Werte ueber Median * 1,8 werden einmal halbiert, Werte unter Median / 1,8
 * einmal verdoppelt. Die Eingabe wird dabei nicht veraendert. Das faengt den
 * dokumentierten Oktavsprung ab, macht die Autokorrelation aber nicht
 * fehlerfrei.
 */
function octaveCorrect(run) {
    if (run.length === 0)
        return [];
    const sorted = run.map((frame) => frame.f0).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return run.map((frame) => {
        let f0 = frame.f0;
        if (f0 > median * exports.OCTAVE_RATIO)
            f0 /= 2;
        else if (f0 < median / exports.OCTAVE_RATIO)
            f0 *= 2;
        return { ...frame, f0 };
    });
}
/** Entfernt den angegebenen Anteil an Anfang und Ende, sofern vier Fenster bleiben. */
function trimEdges(run, fraction = exports.CONTOUR_EDGE_TRIM) {
    const cut = Math.floor(run.length * fraction);
    return run.length - 2 * cut >= 4 ? run.slice(cut, run.length - cut) : [...run];
}
/** Tonhoehenabstand in Halbtoenen relativ zu `referenceHz`. */
function semitones(hz, referenceHz) {
    return 12 * Math.log2(hz / referenceHz);
}
/** Derselbe obere Median, den das HTML-Werkzeug fuer seine Referenz benutzt. */
function medianReferenceHz(span) {
    if (span.length === 0)
        throw new Error('Keine F0-Werte fuer eine Referenz vorhanden.');
    const sorted = span.map((frame) => frame.f0).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}
/** Sechs Stuetzstellen und Kenngroessen wie in `scripts/tone-contour.html`. */
function summarizeContour(span, referenceHz) {
    if (span.length === 0)
        throw new Error('Eine leere Strecke hat keine Tonkontur.');
    if (!Number.isFinite(referenceHz) || referenceHz <= 0) {
        throw new RangeError('referenceHz muss eine positive Zahl sein.');
    }
    const n = span.length;
    const at = (position) => semitones(span[Math.min(n - 1, Math.round(position * (n - 1)))].f0, referenceHz);
    const pts = [0, 0.2, 0.4, 0.6, 0.8, 1].map(at);
    const all = span.map((frame) => semitones(frame.f0, referenceHz));
    const mean = all.reduce((sum, value) => sum + value, 0) / n;
    return {
        pts,
        start: pts[0],
        end: pts[5],
        min: Math.min(...all),
        max: Math.max(...all),
        mean,
        slope: pts[5] - pts[0],
        durMs: Math.round((span[n - 1].t - span[0].t) * 1000),
    };
}
/**
 * Passt die gemessene Kontur qualitativ zum erwarteten Ton?
 *
 * Die Schwellen sind unveraendert aus dem Messwerkzeug uebernommen. Das ist
 * eine Heuristik und ausdruecklich kein Urteil ueber die gesamte Aussprache.
 */
function matchesTone(tone, summary) {
    switch (tone) {
        case 'mid':
            return Math.abs(summary.slope) < 3 && Math.abs(summary.mean) < 2.5;
        case 'low':
            return summary.mean < -0.5 && summary.slope < 1.5;
        case 'falling':
            return summary.slope < -3 && summary.max > summary.end + 3;
        case 'high':
            return summary.end > 0 && summary.end >= summary.start - 1;
        case 'rising':
            return summary.end - summary.min > 3 && summary.end > summary.start - 0.5;
    }
}
/**
 * Formanteil derselben Heuristik, ohne Aussagen ueber absolute Sprechlage.
 *
 * Bei der Referenz einer einzelnen Aufnahme liegt deren eigener Median per
 * Definition nahe null Halbtönen. Dann sind mittel, tief und hoch nicht
 * belastbar unterscheidbar: dieselbe ebene Form koennte alle drei Register
 * repraesentieren. Fuer diese Toene liefert die Funktion deshalb `null`
 * statt eines scheinbar objektiven Urteils. Nur die rein relativen Fall- und
 * Steigbedingungen aus dem Messwerkzeug bleiben ohne Sprecherreferenz uebrig.
 */
function matchesToneShape(tone, summary) {
    switch (tone) {
        case 'mid':
            return null;
        case 'low':
            return null;
        case 'falling':
            return summary.slope < -3 && summary.max > summary.end + 3;
        case 'high':
            return null;
        case 'rising':
            return summary.end - summary.min > 3 && summary.end > summary.start - 0.5;
    }
}
/**
 * Vollstaendige Messpipeline fuer einen Mono-PCM-Puffer.
 *
 * Das HTML bestimmt `referenceHz` aus allen Clips derselben Stimme. Fuer eine
 * einzelne lokale Aufnahme kann stattdessen der Median ihrer bewerteten
 * Strecke verwendet werden; dadurch bleibt die Konturform sichtbar, aber die
 * absolute Einordnung der Sprechlage ist nicht kalibriert. Aufrufer mit einer
 * persoenlichen Referenz koennen sie deshalb ausdruecklich uebergeben.
 */
function analyzeToneContour(samples, sampleRate, referenceHz, recoverWeakVoicing = true) {
    const prepared = downsampleForF0(samples, sampleRate);
    const frames = autocorrF0(prepared.samples, prepared.sampleRate, recoverWeakVoicing);
    const voicedMs = frames.filter((frame) => frame.f0 > 0).length * 10;
    const run = longestRun(frames);
    if (!run) {
        return {
            status: 'unmeasurable',
            reason: 'no-voiced-run',
            inputSampleRate: sampleRate,
            analysisSampleRate: prepared.sampleRate,
            frames,
            voicedMs,
        };
    }
    const span = trimEdges(octaveCorrect(run), exports.CONTOUR_EDGE_TRIM);
    const ref = referenceHz ?? medianReferenceHz(span);
    return {
        status: 'measured',
        inputSampleRate: sampleRate,
        analysisSampleRate: prepared.sampleRate,
        frames,
        span,
        voicedMs,
        referenceHz: ref,
        referenceKind: referenceHz === undefined ? 'attempt-median' : 'speaker-baseline',
        summary: summarizeContour(span, ref),
    };
}

return exports; })();
