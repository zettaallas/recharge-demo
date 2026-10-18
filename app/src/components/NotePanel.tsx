import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HELP_CHIPS, SYMBOLS } from '@/data/vocab';
import { useApp } from '@/state/AppContext';
import type { Note, SymbolKey } from '@/types';
import { Icon } from './Icon';
import type { IconName } from './icons';

// "Add more" for one place in the check-in: symbols, typed words and "What would help?".
// Typing is always optional. Photo, drawing and voice notes are added in a later step.
type Tab = 'symbols' | 'type' | 'help';

export function NotePanel({ value, onChange }: { value: Note; onChange: (n: Note) => void }) {
  const { t, colors } = useApp();
  const [tab, setTab] = useState<Tab>('symbols');
  const set = (patch: Partial<Note>) => onChange({ ...value, ...patch });
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  const tabs: [Tab, IconName, string][] = [
    ['symbols', 'grid', t('symbols')],
    ['type', 'keyboard', t('type')],
    ['help', 'bulb', t('whatHelp')],
  ];

  const input = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }];

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface2 }]}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map(([k, ic, label]) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(k)}
              style={[styles.tab, { backgroundColor: on ? colors.accent : colors.surface, borderColor: on ? colors.accent : colors.line }]}>
              <Icon name={ic} size={20} color={on ? colors.accentInk : colors.ink} />
              <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'symbols' && (
        <View style={styles.symGrid}>
          {SYMBOLS.map((s) => {
            const on = value.symbols.includes(s.key);
            return (
              <Pressable
                key={s.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => set({ symbols: toggle<SymbolKey>(value.symbols, s.key) })}
                style={[styles.sym, { borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
                <View style={[styles.symIc, { backgroundColor: colors.surface2 }]}>
                  <Icon name={s.icon as IconName} size={26} />
                </View>
                <Text style={{ fontWeight: '700', color: colors.ink, textAlign: 'center' }}>{t(s.key)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {tab === 'type' && (
        <TextInput
          multiline
          value={value.text ?? ''}
          onChangeText={(text) => set({ text })}
          placeholder={t('typeHere')}
          placeholderTextColor={colors.ink2}
          accessibilityLabel={t('type')}
          style={input}
        />
      )}

      {tab === 'help' && (
        <View style={{ gap: 12 }}>
          <View style={styles.chips}>
            {HELP_CHIPS.map((c) => {
              const on = value.help.chips.includes(c);
              return (
                <Pressable
                  key={c}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => set({ help: { ...value.help, chips: toggle(value.help.chips, c) } })}
                  style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surface }]}>
                  <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{(on ? '✓ ' : '') + c}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            multiline
            value={value.help.text}
            onChangeText={(text) => set({ help: { ...value.help, text } })}
            placeholder={t('typeHere')}
            placeholderTextColor={colors.ink2}
            accessibilityLabel={t('whatHelp')}
            style={input}
          />
        </View>
      )}

      <Text style={{ color: colors.ink2, fontSize: 13 }}>Photo, drawing and voice notes are coming in a later step.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, padding: 14, gap: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  symGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sym: { flexGrow: 1, flexBasis: 130, minHeight: 104, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  symIc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlignVertical: 'top' },
});
