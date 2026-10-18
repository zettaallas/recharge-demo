import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';
import { clamp } from '@/domain/util';
import { useApp } from '@/state/AppContext';
import type { Colors } from '@/theme';
import type { Hat as HatName, ZipColour } from '@/types';

// Zip, the battery buddy. Energy only: no face, no emotions, so pupils never have to read or match facial expressions.
// Drawing ported from the web prototype (index.html, Zip and Hat).

function Hat({ hat, c }: { hat: HatName; c: Colors }) {
  switch (hat) {
    case 'beanie':
      return (
        <G>
          <Path d="M37 26 A23 19 0 0 1 83 26 Z" fill={c.hat} />
          <Rect x="34" y="21" width="52" height="8" rx="4" fill={c.hat2} />
          <Circle cx="60" cy="6" r="5.5" fill={c.hat2} />
        </G>
      );
    case 'cap':
      return (
        <G>
          <Path d="M39 26 A21 17 0 0 1 81 26 Z" fill={c.hat} />
          <Path d="M78 22 h22 a3 3 0 0 1 0 6 h-22 z" fill={c.hat} />
          <Circle cx="60" cy="10" r="3" fill={c.hat2} />
        </G>
      );
    case 'crown':
      return <Polygon points="40,28 40,8 50,18 60,3 70,18 80,8 80,28" fill={c.hat2} stroke={c.zipLine} strokeWidth={1.5} strokeLinejoin="round" />;
    case 'headphones':
      return (
        <G>
          <Path d="M26 60 A34 36 0 0 1 94 60" fill="none" stroke={c.hat} strokeWidth={7} strokeLinecap="round" />
          <Rect x="14" y="52" width="14" height="26" rx="6" fill={c.hat} />
          <Rect x="92" y="52" width="14" height="26" rx="6" fill={c.hat} />
        </G>
      );
    case 'flower':
      return (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle key={a} cx={86 + 8 * Math.cos((a * Math.PI) / 180)} cy={22 + 8 * Math.sin((a * Math.PI) / 180)} r="6" fill={c.hat2} />
          ))}
          <Circle cx="86" cy="22" r="5" fill={c.hat} />
        </G>
      );
    default:
      return null;
  }
}

/** charge: 0 to 1, or null when there is nothing to show yet. */
export function Zip({ charge, colour = 'teal', hat = 'none', size = 120, label }: {
  charge: number | null;
  colour?: ZipColour;
  hat?: HatName;
  size?: number;
  label?: string;
}) {
  const { colors: c } = useApp();
  const id = 'well' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = charge == null ? 0 : clamp(charge, 0, 1);
  const pct = Math.round(v * 100);
  const fill = v >= 0.7 ? c.hi : v >= 0.4 ? c.mid : c.lo;
  const shell = c.zip[colour];
  return (
    <Svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? 'Zip the battery buddy, ' + pct + '% charged'}>
      <Defs>
        <ClipPath id={id}>
          <Rect x="32" y="40" width="56" height="78" rx="11" />
        </ClipPath>
      </Defs>
      <Path d="M24 82 q-14 6 -14 22" fill="none" stroke={shell} strokeWidth={7} strokeLinecap="round" />
      <Path d="M96 82 q14 6 14 22" fill="none" stroke={shell} strokeWidth={7} strokeLinecap="round" />
      <Rect x="36" y="124" width="18" height="12" rx="6" fill={shell} />
      <Rect x="66" y="124" width="18" height="12" rx="6" fill={shell} />
      <Rect x="47" y="22" width="26" height="12" rx="4" fill={shell} />
      <Rect x="24" y="30" width="72" height="98" rx="20" fill={shell} />
      <Rect x="32" y="40" width="56" height="78" rx="11" fill={c.zipWell} />
      <G clipPath={`url(#${id})`}>
        <Rect x="32" y={40 + 78 * (1 - v)} width="56" height={78 * v} fill={fill} />
      </G>
      <Path d="M64 50 L46 82 H58 L54 108 L74 72 H62 Z" fill={c.zipBolt} stroke={c.zipLine} strokeWidth={1.2} strokeLinejoin="round" opacity={0.9} />
      <Hat hat={hat} c={c} />
    </Svg>
  );
}
