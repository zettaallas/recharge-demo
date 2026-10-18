import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import type { Rating } from '@/types';

// The 5-segment battery pupils use to rate a place or moment. Energy, not feelings.
// Tapping the current level again clears it.
export function Battery({ value, onChange, label }: { value: Rating | undefined; onChange: (v: Rating | null) => void; label: string }) {
  const { colors, t } = useApp();
  const fill = value ? (value <= 2 ? colors.lo : value === 3 ? colors.mid : colors.hi) : undefined;
  return (
    <View style={styles.row}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.battery, { borderColor: colors.ink }]}>
        {([1, 2, 3, 4, 5] as Rating[]).map((n) => {
          const on = !!value && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === n }}
              accessibilityLabel={label + ': ' + t('batteryLevel', { n })}
              onPress={() => onChange(value === n ? null : n)}
              hitSlop={4}
              style={[styles.seg, { backgroundColor: on ? fill : colors.noneBg }]}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: on ? colors.surface : colors.ink2 }}>{n}</Text>
            </Pressable>
          );
        })}
        <View style={[styles.nub, { backgroundColor: colors.ink }]} />
      </View>
      <Text style={{ color: colors.ink2, fontSize: 14 }}>{value ? t('batteryLevel', { n: value }) : t('notRated')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  battery: { flexDirection: 'row', gap: 4, padding: 5, borderWidth: 3, borderRadius: 12 },
  seg: { width: 46, height: 48, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  nub: { position: 'absolute', right: -9, top: '30%', width: 6, height: '40%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
});
