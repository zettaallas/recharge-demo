import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { SavedDialog } from '@/components/SavedDialog';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { SYMBOLS } from '@/data/vocab';
import { slotsFor } from '@/domain/checkins';
import { keyAdultName } from '@/domain/posts';
import { needsAdult, saveSymbols } from '@/domain/symbols';
import { useApp } from '@/state/AppContext';
import type { SlotId, SymbolKey } from '@/types';

// Symbol board: say something without words. Pick one or more symbols; optionally add details and where it was;
// then Save. A pop-up confirms it, and OK goes back home.
export default function SymbolBoard() {
  const { t, colors, db, me, save: saveDb } = useApp();
  const router = useRouter();
  const [picked, setPicked] = useState<SymbolKey[]>([]);
  const [text, setText] = useState('');
  const [where, setWhere] = useState<SlotId | null>(null);
  const [saved, setSaved] = useState<{ adult: boolean; flagged: boolean } | null>(null);
  if (!me) return null;
  const adult = keyAdultName(db, me.id);
  const { base, pins } = slotsFor(db, me);
  const places = [
    ...base.map((s) => ({ id: s.id, label: s.name + ' · ' + s.place })),
    ...pins.map((p) => ({ id: p.id, label: p.emoji + ' ' + p.name })),
  ];

  const toggle = (k: SymbolKey) => setPicked((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));

  const save = async () => {
    const whereLabel = places.find((p) => p.id === where)?.label;
    const res = await saveDb((d) => saveSymbols(d, me.id, { symbols: picked, where: where ?? undefined, whereLabel, text }, (s) => t(s)));
    if (res.ok) setSaved({ adult: needsAdult(picked), flagged: res.value });
  };

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('back')} onPress={() => router.back()} />
      </Row>
      <H1>{t('symbols')}</H1>
      <Muted>{t('symbolsPick')}</Muted>

      <View style={styles.grid}>
        {SYMBOLS.map((s) => {
          const on = picked.includes(s.key);
          return (
            <Pressable
              key={s.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(s.key)}
              style={({ pressed }) => [
                styles.sym,
                { borderColor: on || pressed ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface },
              ]}>
              {on && (
                <View style={[styles.tick, { backgroundColor: colors.accent }]}>
                  <Icon name="check" size={18} color={colors.accentInk} />
                </View>
              )}
              <View style={[styles.ic, { backgroundColor: colors.surface2 }]}>
                <Icon name={s.icon as IconName} size={36} />
              </View>
              <Text style={[styles.label, { color: colors.ink }]}>{t(s.key)}</Text>
            </Pressable>
          );
        })}
      </View>

      {picked.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.lbl, { color: colors.ink }]}>{t('addDetails')}</Text>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder={t('addDetailsHint')}
            placeholderTextColor={colors.ink2}
            accessibilityLabel={t('addDetails')}
            style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
          />

          <Text style={[styles.lbl, { color: colors.ink }]}>{t('whereOptional')}</Text>
          <Dropdown
            label={t('whereOptional')}
            placeholder={t('wherePlaceholder')}
            noneLabel={t('whereNone')}
            options={places}
            value={where}
            onChange={setWhere}
          />
        </View>
      )}

      <Row>
        <Button label={t('saveSymbols')} kind="primary" large disabled={picked.length === 0} onPress={save} />
      </Row>

      <SavedDialog
        visible={!!saved}
        message={saved?.adult ? t('symSent', { adult }) : t('thanksTelling')}
        extra={saved?.flagged ? t('thanksSafe') : undefined}
        onOk={() => {
          setSaved(null);
          router.dismissTo('/home');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sym: { flexGrow: 1, flexBasis: 150, minHeight: 150, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 },
  tick: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ic: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  lbl: { fontSize: 17, fontWeight: '700' },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlignVertical: 'top' },
});
