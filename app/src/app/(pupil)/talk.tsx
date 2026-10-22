import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { SavedDialog } from '@/components/SavedDialog';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { slotsFor } from '@/domain/checkins';
import { keyAdultName } from '@/domain/posts';
import { requestTalk } from '@/domain/talk';
import { useApp } from '@/state/AppContext';
import type { SlotId } from '@/types';

// Ask to talk to my teacher: one button sends the request. What it's about and where you are are both optional.
export default function Talk() {
  const { t, colors, db, me, save } = useApp();
  const router = useRouter();
  const [text, setText] = useState('');
  const [where, setWhere] = useState<SlotId | null>(null);
  const [saved, setSaved] = useState<{ flagged: boolean } | null>(null);
  if (!me) return null;
  const adult = keyAdultName(db, me.id);
  const { base, pins } = slotsFor(db, me);
  const places = [
    ...base.map((s) => ({ id: s.id, label: s.name + ' · ' + s.place })),
    ...pins.map((p) => ({ id: p.id, label: p.emoji + ' ' + p.name })),
  ];

  const send = async () => {
    const whereLabel = places.find((p) => p.id === where)?.label;
    const res = await save((d) => requestTalk(d, me.id, t('talkSummary'), { text, where: where ?? undefined, whereLabel }));
    if (res.ok) setSaved({ flagged: res.value });
  };

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('talkTeacher')}</H1>
      <Muted>{t('talkIntro', { adult })}</Muted>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.lbl, { color: colors.ink }]}>{t('talkDetails')}</Text>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('addDetailsHint')}
          placeholderTextColor={colors.ink2}
          accessibilityLabel={t('talkDetails')}
          style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
        />
        <Text style={[styles.lbl, { color: colors.ink }]}>{t('whereOptional')}</Text>
        <Dropdown label={t('whereOptional')} placeholder={t('wherePlaceholder')} noneLabel={t('whereNone')} options={places} value={where} onChange={setWhere} />
      </View>

      <Row>
        <Button label={t('talkSend')} kind="break" large onPress={send} />
      </Row>

      <SavedDialog
        visible={!!saved}
        message={t('talkSent', { adult })}
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
  lbl: { fontSize: 17, fontWeight: '700' },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlignVertical: 'top' },
});
