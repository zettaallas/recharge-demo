import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { Icon } from './Icon';
import type { IconName } from './icons';

// A big, colourful home button: a solid icon circle on a soft colour, a short title and one line underneath.
// Pressing it nudges it in slightly. There is no other animation.
export function BigButton({ icon, title, sub, bg, accent, onAccent, badge, onPress }: {
  icon: IconName;
  title: string;
  sub: string;
  /** soft background colour */
  bg: string;
  /** strong colour for the icon circle and border */
  accent: string;
  /** icon colour on the accent circle; defaults to white-ish surface. Use a dark colour on the amber accent for contrast in both themes. */
  onAccent?: string;
  /** small count, e.g. new replies */
  badge?: string;
  onPress: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title + (badge ? ', ' + badge : '') + '. ' + sub}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: accent, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}>
      <View style={[styles.ic, { backgroundColor: accent }]}>
        <Icon name={icon} size={34} color={onAccent ?? colors.surface} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <Text style={{ color: colors.ink, fontSize: 15, opacity: 0.8 }}>{sub}</Text>
      </View>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={{ color: onAccent ?? colors.surface, fontWeight: '700', fontSize: 13 }}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.chev, { color: accent }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 104,
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ic: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chev: { fontSize: 36, fontWeight: '700', marginTop: -4 },
});
