import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/AppContext';
import { radius } from '@/theme';
import type { Pupil } from '@/types';

// Small shared building blocks, styled like the web prototype's .btn, .banner, .card and .avatar.

/** belowBar: the screen sits under the pupil top bar, which already handles the top safe area. */
export function Screen({ children, center, scroll = true, belowBar, wide }: { children: ReactNode; center?: boolean; scroll?: boolean; belowBar?: boolean; wide?: boolean }) {
  const { colors } = useApp();
  // wide: staff screens are laptop-first, so they use more of a big screen
  const inner = <View style={[styles.inner, wide && styles.wide, center && styles.center]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={belowBar ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return <Text accessibilityRole="header" style={[styles.h1, { color: colors.ink }]}>{children}</Text>;
}

export function Muted({ children, small, center }: { children: ReactNode; small?: boolean; center?: boolean }) {
  const { colors } = useApp();
  return <Text style={{ color: colors.ink2, fontSize: small ? 14 : 16, textAlign: center ? 'center' : 'left' }}>{children}</Text>;
}

type BtnKind = 'default' | 'primary' | 'quiet' | 'danger' | 'break';

export function Button({ label, onPress, kind = 'default', large, disabled, accessibilityLabel, style }: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  large?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const bg = { default: colors.surface, primary: colors.accent, quiet: 'transparent', danger: colors.warnBg, break: colors.break }[kind];
  const fg = { default: colors.ink, primary: colors.accentInk, quiet: colors.accent, danger: colors.warnInk, break: colors.breakInk }[kind];
  const border = kind === 'default' ? colors.line : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        large && styles.btnLg,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: large ? 18 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ kind, children }: { kind: 'ok' | 'warn' | 'info'; children: ReactNode }) {
  const { colors } = useApp();
  const bg = { ok: colors.okBg, warn: colors.warnBg, info: colors.accentSoft }[kind];
  const fg = { ok: colors.okInk, warn: colors.warnInk, info: colors.ink }[kind];
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 16 }}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Avatar({ pupil, size = 56 }: { pupil: Pupil; size?: number }) {
  const { colors } = useApp();
  const initials = pupil.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.av[pupil.avatar], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityHint={hint}
      onPress={() => onChange(!checked)}
      style={[styles.toggle, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <View style={[styles.check, { borderColor: colors.accent, backgroundColor: checked ? colors.accent : 'transparent' }]}>
        {checked && <Text style={{ color: colors.accentInk, fontWeight: '700' }}>✓</Text>}
      </View>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{label}</Text>
        {!!hint && <Text style={{ color: colors.ink2, fontSize: 14 }}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

/** A big square key for the class-code keyboard and the PIN pad. */
export function Key({ label, onPress, size = 52, accessibilityLabel }: { label: string; onPress: () => void; size?: number; accessibilityLabel?: string }) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        { width: size, height: size, borderRadius: size > 60 ? 20 : 12, borderColor: colors.line, backgroundColor: pressed ? colors.accentSoft : colors.surface },
      ]}>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: size > 60 ? 28 : 18 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  center: { alignItems: 'center' },
  wide: { maxWidth: 1160 },
  h1: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  btn: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnLg: { minHeight: 60, paddingHorizontal: 24, borderRadius: radius.md - 2 },
  banner: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  key: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignSelf: 'flex-start' },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
