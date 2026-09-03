import Svg, { Line, Polyline } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Gemessener relativer Tonhöhenverlauf mit sechs Stützstellen.
 *
 * Die Nulllinie ist der Median **dieser** Aufnahme. Deshalb zeigt die Grafik
 * zuverlässig Richtung und Form, aber keine absolute Hoch-/Tieflage der
 * Stimme. Diese Grenze wird neben der Grafik auch in Worten erklärt.
 */
export function MeasuredToneContour({ points }: { points: number[] }) {
  const theme = useTheme();
  const finite = points.filter(Number.isFinite);
  if (finite.length < 2) return null;

  const width = 300;
  const height = 92;
  const inset = 8;
  const maxAbs = Math.max(3, ...finite.map((point) => Math.abs(point)));
  const x = (index: number) => inset + (index / (finite.length - 1)) * (width - inset * 2);
  const y = (value: number) => height / 2 - (value / maxAbs) * (height / 2 - inset);
  const coordinates = finite.map((point, index) => `${x(index)},${y(point)}`).join(' ');

  const spokenPoints = finite
    .map((point) => `${point >= 0 ? 'plus ' : 'minus '}${Math.abs(point).toFixed(1)}`)
    .join(', ');

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityRole="image"
      accessibilityLabel={`Gemessene Tonkontur in relativen Halbtönen: ${spokenPoints}`}>
      <Line
        x1={inset}
        x2={width - inset}
        y1={height / 2}
        y2={height / 2}
        stroke={theme.textSecondary}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Polyline
        points={coordinates}
        fill="none"
        stroke={theme.text}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
