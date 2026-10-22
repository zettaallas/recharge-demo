import { Platform } from 'react-native';
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
      // on the web the native screen-reader props reach the <svg> tag unchanged and React warns about them;
      // there, aria-label / aria-hidden do the same job
      {...(Platform.OS === 'web'
        ? label
          ? { 'aria-label': label, role: 'img' }
          : { 'aria-hidden': true }
        : { accessible: !!label, accessibilityLabel: label, importantForAccessibility: label ? 'yes' : 'no-hide-descendants' })}
    />
  );
}
