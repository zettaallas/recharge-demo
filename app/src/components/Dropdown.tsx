import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { Icon } from './Icon';

// A simple, calm drop-down: one button shows the current choice; tapping it opens the list underneath.
// Choosing an option closes the list. "None" clears the choice, so it always stays optional.
export function Dropdown({ label, placeholder, options, value, onChange, noneLabel }: {
  label: string;
  placeholder: string;
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
  noneLabel: string;
}) {
  const { colors } = useApp();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ': ' + (current?.label ?? placeholder)}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[styles.field, { borderColor: open ? colors.accent : colors.line, backgroundColor: colors.surface }]}>
        <Text style={{ flex: 1, fontSize: 16, color: current ? colors.ink : colors.ink2 }}>{current?.label ?? placeholder}</Text>
        <Text style={{ color: colors.ink2, fontSize: 16 }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.list, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          {[{ id: '', label: noneLabel }, ...options].map((o) => {
            const on = (o.id || null) === value;
            return (
              <Pressable
                key={o.id || 'none'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => pick(o.id || null)}
                style={({ pressed }) => [styles.option, { backgroundColor: on || pressed ? colors.accentSoft : 'transparent' }]}>
                <Text style={{ flex: 1, fontSize: 16, color: o.id ? colors.ink : colors.ink2 }}>{o.label}</Text>
                {on && <Icon name="check" size={18} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderWidth: 2, borderRadius: 14, paddingHorizontal: 14 },
  list: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14 },
});
