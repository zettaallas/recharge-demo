import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CHIP_ICON, HELP_CHIPS, PLACE_SYMBOLS, SYMBOL_ICON } from '@/data/vocab';
import { useApp } from '@/state/AppContext';
import type { Note, SymbolKey } from '@/types';
import { Icon } from './Icon';
import { PhotoPicker } from './PhotoPicker';
import { PictoGrid } from './Pictos';
import type { IconName } from './icons';
import { OptionalWords } from './ui';

// "Add more" for one place in the check-in: a photo, symbols, typed words or "What helps?".
// Pictures come first; typing is always optional. Drawing and voice notes are added in a later step.
type Tab = 'photo' | 'symbols' | 'type' | 'help';

export function NotePanel({ value, onChange }: { value: Note; onChange: (n: Note) => void }) {
  const { t, colors } = useApp();
  const [tab, setTab] = useState<Tab>('symbols');
  const set = (patch: Partial<Note>) => onChange({ ...value, ...patch });
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  const tabs: [Tab, IconName, string][] = [
    ['symbols', 'grid', t('symbols')],
    ['help', 'bulb', t('whatHelp')],
    ['photo', 'camera', t('photo')],
    ['type', 'keyboard', t('type')],
  ];

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

      {tab === 'photo' && <PhotoPicker value={value.photo} onChange={(photo) => set({ photo })} />}

      {tab === 'symbols' && (
        <PictoGrid
          size="sm"
          items={PLACE_SYMBOLS.map((k) => ({ key: k, icon: SYMBOL_ICON[k], label: t(k) }))}
          picked={value.symbols}
          onToggle={(k) => set({ symbols: toggle<SymbolKey>(value.symbols, k as SymbolKey) })}
        />
      )}

      {tab === 'type' && (
        <TextInput
          multiline
          value={value.text ?? ''}
          onChangeText={(text) => set({ text })}
          placeholder={t('typeHere')}
          placeholderTextColor={colors.ink2}
          accessibilityLabel={t('type')}
          style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
        />
      )}

      {tab === 'help' && (
        <View style={{ gap: 12 }}>
          <PictoGrid
            size="sm"
            items={HELP_CHIPS.map((c) => ({ key: c, icon: CHIP_ICON[c] ?? 'bulb', label: c }))}
            picked={value.help.chips}
            onToggle={(c) => set({ help: { ...value.help, chips: toggle(value.help.chips, c) } })}
          />
          <OptionalWords value={value.help.text} onChange={(text) => set({ help: { ...value.help, text } })} label={t('whatHelp')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, padding: 14, gap: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlignVertical: 'top' },
});
