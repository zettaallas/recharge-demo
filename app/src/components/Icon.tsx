import { SvgXml } from 'react-native-svg';
import { useApp } from '@/state/AppContext';
import { ICONS, type IconName } from './icons';

/** A line icon. Decorative by default; pass a label when the icon is the only thing saying what something is. */
export function Icon({ name, size = 22, color, label }: { name: IconName; size?: number; color?: string; label?: string }) {
  const { colors } = useApp();
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color ?? colors.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return (
    <SvgXml
      xml={xml}
      width={size}
      height={size}
      accessible={!!label}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}
