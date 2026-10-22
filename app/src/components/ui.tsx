import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/AppContext';
import { radius } from '@/theme';
import type { Pupil } from '@/types';
import { Icon } from './Icon';
import type { IconName } from './icons';

// Small shared building blocks, styled like the web prototype's .btn, .banner, .card and .avatar.

/** belowBar: the screen sits under the pupil top bar, which already handles the top safe area. */
export function Screen({ children, center, scroll = true, belowBar, wide }: { children: ReactNode; center?: boolean; scroll?: boolean; belowBar?: boolean; wide?: boolean }) {
  const { colors, mode, session, refresh, offline, saveError, clearSaveError } = useApp();
  const [pulling, setPulling] = useState(false);
  // Supabase mode: pull down to fetch the latest data from school
  const onRefresh = async () => {
    setPulling(true);
    await refresh();
    setPulling(false);
  };
  // wide: staff screens are laptop-first, so they use more of a big screen
  const inner = (
    <View style={[styles.inner, wide && styles.wide, center && styles.center]}>
      {mode === 'supabase' && offline && !!session && !saveError && (
        <Banner kind="warn">Can't reach school right now. You can keep looking; pull down to try again.</Banner>
      )}
      {mode === 'supabase' && !!saveError && !!session && (
        <View style={{ gap: 6 }}>
          <Banner kind="warn">{saveError}</Banner>
          <Row>
            <Button label="OK" kind="quiet" accessibilityLabel="Hide this message" onPress={clearSaveError} />
          </Row>
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={belowBar ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={mode === 'supabase' && session ? <RefreshControl refreshing={pulling} onRefresh={onRefresh} /> : undefined}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
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

export function Button({ label, onPress, kind = 'default', large, disabled, accessibilityLabel, style, icon }: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  large?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** a picture before the word (pupil screens pair every button with one) */
  icon?: IconName;
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
      <View style={styles.btnInner}>
        {!!icon && <Icon name={icon} size={large ? 24 : 20} color={fg} />}
        <Text style={{ color: fg, fontWeight: '700', fontSize: large ? 18 : 16 }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Words are always optional: a small "Add words" button that opens the text box. Starts open if there are words already. */
export function OptionalWords({ value, onChange, label, multiline = true, maxLength, onSubmit }: {
  value: string;
  onChange: (s: string) => void;
  /** what the box is for, read out by screen readers */
  label: string;
  multiline?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
}) {
  const { t, colors } = useApp();
  const [open, setOpen] = useState(!!value);
  if (!open)
    return (
      <Button icon="keyboard" label={t('addWords')} accessibilityLabel={t('addWords') + ', ' + t('optional') + ': ' + label} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />
    );
  return (
    <View style={{ gap: 8 }}>
      <TextInput
        autoFocus
        multiline={multiline}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        maxLength={maxLength}
        placeholder={t('typeHere')}
        placeholderTextColor={colors.ink2}
        accessibilityLabel={label}
        style={[styles.words, multiline && { minHeight: 96, textAlignVertical: 'top' }, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
      />
      {!value && <Button kind="quiet" icon="x" label={t('hideWords')} onPress={() => setOpen(false)} style={{ alignSelf: 'flex-start' }} />}
    </View>
  );
}

/** A small "i" button: longer explanations stay out of the way until a pupil wants them. */
export function InfoTip({ text }: { text: string }) {
  const { t, colors } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('moreInfo')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        hitSlop={8}
        style={[styles.info, { borderColor: colors.line, backgroundColor: open ? colors.accentSoft : colors.surface }]}>
        <Icon name="info" size={22} color={colors.ink2} />
      </Pressable>
      {open && <Text style={{ color: colors.ink2, fontSize: 15 }}>{text}</Text>}
    </View>
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

export function Avatar({ pupil, size = 56 }: { pupil: Pick<Pupil, 'name' | 'avatar'>; size?: number }) {
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
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  words: { minHeight: 48, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16 },
  info: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnLg: { minHeight: 60, paddingHorizontal: 24, borderRadius: radius.md - 2 },
  banner: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  key: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignSelf: 'flex-start' },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
