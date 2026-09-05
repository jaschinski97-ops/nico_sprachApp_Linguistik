const { execFileSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

// Decode final bytes, not the provider's original waveform. No remote inputs.
function decodeAudio(file) {
  const pcm = execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', '-nostdin',
    '-protocol_whitelist', 'file,pipe', '-i', file, '-map', '0:a:0', '-vn',
    '-ac', '1', '-ar', '24000', '-f', 'f32le', 'pipe:1'],
  { windowsHide: true, timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  if (!pcm.length || pcm.length % 4) throw Error('Keine dekodierbaren Audiodaten.');
  return Float32Array.from({ length: pcm.length / 4 }, (_, i) => pcm.readFloatLE(i * 4));
}
function decodeImage(file) {
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', '-nostdin',
    '-protocol_whitelist', 'file,pipe', '-i', file, '-map', '0:v:0', '-f', 'null', '-'],
  { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
}
module.exports = { decodeAudio, decodeImage };
