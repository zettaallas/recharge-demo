import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { band } from '@/domain/util';
import { useApp } from '@/state/AppContext';

// Small building blocks for staff screens (laptop first, still fine on a phone).
// Staff wording is English only for now, written straight into these screens.

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>{children}</View>;
}

export function H2({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return <Text accessibilityRole="header" style={[styles.h2, { color: colors.ink }]}>{children}</Text>;
}

export function Pill({ text, kind = 'plain' }: { text: string; kind?: 'plain' | 'hi' | 'mid' | 'lo' }) {
  const { colors } = useApp();
  const bg = { plain: colors.surface2, hi: colors.hiBg, mid: colors.midBg, lo: colors.loBg }[kind];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Stat({ label, n, alert }: { label: string; n: number | string; alert?: boolean }) {
  const { colors } = useApp();
  return (
    <View style={[styles.stat, { backgroundColor: alert ? colors.warnBg : colors.surface, borderColor: alert ? colors.lo : colors.line }]}>
      <Text style={{ color: colors.ink2, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: alert ? colors.warnInk : colors.ink, fontSize: 30, fontWeight: '700' }}>{n}</Text>
    </View>
  );
}

/** Small read-only battery (5 segments) for tables. */
export function MiniBattery({ value, label }: { value: number | null; label: string }) {
  const { colors } = useApp();
  const fill = { hi: colors.hi, mid: colors.mid, lo: colors.lo, none: colors.noneBg }[band(value)];
  return (
    <View accessible accessibilityLabel={label + ': ' + (value == null ? 'no data' : value.toFixed(1) + ' of 5')} style={[styles.mini, { borderColor: colors.ink }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={[styles.miniSeg, { backgroundColor: value != null && n <= Math.round(value) ? fill : colors.noneBg }]} />
      ))}
    </View>
  );
}

export const fmtDay = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
  ', ' +
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  h2: { fontSize: 22, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  stat: { flexGrow: 1, flexBasis: 160, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  mini: { flexDirection: 'row', gap: 2, padding: 2, borderWidth: 2, borderRadius: 6, alignSelf: 'flex-start' },
  miniSeg: { width: 10, height: 14, borderRadius: 2 },
});
