# Offline reference speech ONLY. This is not Gemini or a linguistic approval.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$sampleDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.content-studio/measurement-source'))
New-Item -ItemType Directory -Force -Path $sampleDirectory | Out-Null
$sampleSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$sampleFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$sampleTexts = @(
  'Hallo. Guten Morgen. Wie geht es Ihnen?',
  'Ich möchte ein Wasser und ein Brot kaufen. Wie viel kostet das?',
  'Entschuldigung, wo ist der Bahnhof? Gehen Sie geradeaus und dann nach rechts.',
  'Der Zug nach Berlin fährt heute um vierzehn Uhr dreißig von Gleis sieben ab.',
  'Vielen Dank für Ihre Nachricht. Wir treffen uns morgen um zehn Uhr vor dem Haus.'
)
try {
  for ($sampleIndex = 0; $sampleIndex -lt $sampleTexts.Count; $sampleIndex++) {
    $sampleTarget = Join-Path $sampleDirectory ('speech-{0}.wav' -f $sampleIndex)
    $sampleSpeaker.SetOutputToWaveFile($sampleTarget, $sampleFormat)
    $sampleSpeaker.Speak($sampleTexts[$sampleIndex])
    $sampleSpeaker.SetOutputToNull()
  }
  Write-Output ('Reference voice: ' + $sampleSpeaker.Voice.Name)
  Write-Output ('WAV files: ' + $sampleDirectory)
} finally { $sampleSpeaker.Dispose() }
