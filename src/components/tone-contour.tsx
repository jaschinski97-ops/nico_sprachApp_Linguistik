import Svg, { Path } from 'react-native-svg';

import { Tone, TONES } from '@/constants/tones';
import { useToneColor } from '@/hooks/use-theme';

/**
 * Tonkontur als kleine Glyphe: flach-mittel, flach-tief, fallend, flach-hoch,
 * steigend. Die Pfade stammen aus dem geprüften Referenzprototyp und sind für
 * eine 34x21-Zeichenfläche gezeichnet.
 *
 * Die Kontur trägt die Information zusätzlich zur Farbe — wer Farben schlecht
 * unterscheidet, sieht die Tonrichtung trotzdem.
 */
export function ToneContour({
  tone,
  height = 14,
  color,
}: {
  tone: Tone;
  height?: number;
  color?: string;
}) {
  const toneColor = useToneColor();
  const width = (height * 34) / 21;
  return (
    <Svg width={width} height={height} viewBox="0 0 34 21">
      <Path
        d={TONES[tone].path}
        stroke={color ?? toneColor(tone)}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
