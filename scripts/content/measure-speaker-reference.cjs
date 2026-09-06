// Descriptive audit only. No minimum sample size or calibration inferred from TTS.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'content/tone-calibration.json')));
const quantile = (values, p) => {
  const a = [...values].sort((a,b) => a-b); if (!a.length) return null;
  const at = (a.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at);
  return a[lo] + (a[hi] - a[lo]) * (at - lo);
};
const summary = values => ({ n: values.length, medianHz: quantile(values, .5),
  q1Hz: quantile(values, .25), q3Hz: quantile(values, .75), minHz: quantile(values, 0), maxHz: quantile(values, 1) });
const groups = [...new Set(report.entries.map(entry => entry.provider + ':' + entry.voice))];
const result = { measuredAt: new Date().toISOString(), source: 'content/tone-calibration.json',
  method: 'Median of accepted F0 frames per clip, then equal-weight clip summary. Frame counts are not independent repetitions.',
  sufficientForRegisterGate: false,
  conclusion: 'A mixed-tone median is descriptive, not a validated register reference. One token per Microsoft word/tone, no independent repetitions or held-out labelled recordings; Gemini sample not balanced across tones. No universal minimum clip count or spread threshold established by these data.',
  needed: 'Separate provider/model/voice and recording conditions; repeated independently verified tokens balanced across all five tones, phonetic contexts and durations; estimate within-tone and between-tone overlap, then validate thresholds and false-acceptance rate on independent held-out recordings. Determine sample size from that variability and desired error precision, not a guessed number.',
  voices: groups.map(key => {
    const entries = report.entries.filter(entry => entry.provider + ':' + entry.voice === key);
    const clips = entries.map(entry => ({ text: entry.text, sha256: entry.sha256,
      target: entry.check.targetTone ?? 'not-a-verified-monosyllable',
      ...summary(entry.check.track.filter(frame => frame.hz > 0).map(frame => frame.hz)) }));
    return { voice: key, clips: clips.length, distinctTexts: new Set(clips.map(clip => clip.text)).size,
      clipMedians: summary(clips.map(clip => clip.medianHz).filter(value => value !== null)), recordings: clips };
  }) };
fs.writeFileSync(path.join(root, 'content/speaker-reference-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.voices.map(({ recordings, ...voice }) => voice), null, 2));
