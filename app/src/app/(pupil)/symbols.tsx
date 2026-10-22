import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { PictoGrid, PictoHeading } from '@/components/Pictos';
import { SavedDialog } from '@/components/SavedDialog';
import { Button, H1, Muted, OptionalWords, Row, Screen } from '@/components/ui';
import { SYMBOL_GROUPS, SYMBOL_ICON } from '@/data/vocab';
import { slotsFor } from '@/domain/checkins';
import { keyAdultName } from '@/domain/posts';
import { needsAdult, saveSymbols } from '@/domain/symbols';
import { useApp } from '@/state/AppContext';
import type { SlotId, SymbolKey } from '@/types';

// Symbol board: say something without words. Pictures in four groups (feelings, body, around me, I need);
// pick one or more. Words and "where" are both optional. A pop-up confirms it, and OK goes back home.
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

  const toggle = (k: string) => setPicked((x) => (x.includes(k as SymbolKey) ? x.filter((y) => y !== k) : [...x, k as SymbolKey]));

  const save = async () => {
    const whereLabel = places.find((p) => p.id === where)?.label;
    const res = await saveDb((d) => saveSymbols(d, me.id, { symbols: picked, where: where ?? undefined, whereLabel, text }, (s) => t(s)));
    if (res.ok) setSaved({ adult: needsAdult(picked), flagged: res.value });
  };

  return (
    <Screen belowBar>
      <Row>
        <Button icon="back" label={t('back')} onPress={() => router.back()} />
      </Row>
      <H1>{t('symbols')}</H1>
      <Muted>{t('symbolsPick')}</Muted>

      {SYMBOL_GROUPS.map((g) => (
        <View key={g.key} accessibilityLabel={t(g.key)} style={{ gap: 8 }}>
          <PictoHeading icon={g.icon} label={t(g.key)} />
          <PictoGrid items={g.symbols.map((k) => ({ key: k, icon: SYMBOL_ICON[k], label: t(k) }))} picked={picked} onToggle={toggle} />
        </View>
      ))}

      {picked.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <PictoHeading icon="pin" label={t('whereOptional')} />
          <Dropdown
            label={t('whereOptional')}
            placeholder={t('wherePlaceholder')}
            noneLabel={t('whereNone')}
            options={places}
            value={where}
            onChange={setWhere}
          />
          <OptionalWords value={text} onChange={setText} label={t('addDetails')} />
        </View>
      )}

      <Row>
        <Button icon="check" label={t('saveSymbols')} kind="primary" large disabled={picked.length === 0} onPress={save} />
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
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
});
