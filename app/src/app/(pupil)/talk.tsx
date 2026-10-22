import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { PictoGrid, PictoHeading } from '@/components/Pictos';
import { SavedDialog } from '@/components/SavedDialog';
import { Button, H1, Muted, OptionalWords, Row, Screen } from '@/components/ui';
import { TALK_TOPICS } from '@/data/vocab';
import { slotsFor } from '@/domain/checkins';
import { keyAdultName } from '@/domain/posts';
import { requestTalk } from '@/domain/talk';
import { useApp } from '@/state/AppContext';
import type { SlotId, TalkTopic } from '@/types';

// Ask to talk to my teacher: one button sends the request. What it's about (pictures), words and where are all optional.
export default function Talk() {
  const { t, colors, db, me, save } = useApp();
  const router = useRouter();
  const [topics, setTopics] = useState<TalkTopic[]>([]);
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
  const toggle = (k: string) => setTopics((x) => (x.includes(k as TalkTopic) ? x.filter((y) => y !== k) : [...x, k as TalkTopic]));

  const send = async () => {
    const whereLabel = places.find((p) => p.id === where)?.label;
    const res = await save((d) => requestTalk(d, me.id, t('talkSummary'), { text, where: where ?? undefined, whereLabel, topics, topicLabels: topics.map((k) => t(k)) }));
    if (res.ok) setSaved({ flagged: res.value });
  };

  return (
    <Screen belowBar>
      <Row>
        <Button icon="home" label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('talkTeacher')}</H1>
      <Muted>{t('talkIntro', { adult })}</Muted>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <PictoHeading icon="grid" label={t('topicsLabel')} />
        <PictoGrid size="sm" items={TALK_TOPICS.map((x) => ({ key: x.key, icon: x.icon, label: t(x.key) }))} picked={topics} onToggle={toggle} />
        <PictoHeading icon="pin" label={t('whereOptional')} />
        <Dropdown label={t('whereOptional')} placeholder={t('wherePlaceholder')} noneLabel={t('whereNone')} options={places} value={where} onChange={setWhere} />
        <OptionalWords value={text} onChange={setText} label={t('talkDetails')} />
      </View>

      {/* never disabled: a request with no pictures, place or words is fine */}
      <Row>
        <Button icon="message" label={t('talkSend')} kind="break" large onPress={send} />
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
});
