import Svg, { Circle, Line, Path } from 'react-native-svg';
import { band } from '@/domain/util';
import { useApp } from '@/state/AppContext';

// A small battery trend line (1–5). The dashed line marks 2.5, where "some drain" turns into "high drain".
// Ported from Sparkline in the web prototype.
export function Sparkline({ values, w = 140, h = 40, label }: { values: (number | null)[]; w?: number; h?: number; label?: string }) {
  const { colors } = useApp();
  const pts = values.filter((v): v is number => v != null);
  if (pts.length < 2) return null;
  const x = (i: number) => 4 + (i * (w - 8)) / (pts.length - 1);
  const y = (v: number) => 4 + ((5 - v) * (h - 8)) / 4;
  const line = pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (h - 4) + ' L' + x(0).toFixed(1) + ' ' + (h - 4) + ' Z';
  const last = pts[pts.length - 1];
  const dot = { hi: colors.hi, mid: colors.mid, lo: colors.lo, none: colors.line }[band(last)];
  return (
    <Svg width={w} height={h} accessible accessibilityRole="image" accessibilityLabel={label ?? 'Battery trend: ' + pts.map((v) => v.toFixed(1)).join(', ')}>
      <Line x1="4" x2={w - 4} y1={y(2.5)} y2={y(2.5)} stroke={colors.line} strokeDasharray="3 3" />
      <Path d={area} fill={colors.accentSoft} />
      <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2.2} strokeLinejoin="round" />
      <Circle cx={x(pts.length - 1)} cy={y(last)} r={4} fill={dot} stroke={colors.surface} strokeWidth={1.5} />
    </Svg>
  );
}
