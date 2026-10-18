import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Battery } from '@/components/Battery';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { NotePanel } from '@/components/NotePanel';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Zip } from '@/components/Zip';
import { emptyNote, hasNote, saveCheckIn, slotsFor, type PinSlot } from '@/domain/checkins';
import { avg, todayISO } from '@/domain/util';
import { useApp } from '@/state/AppContext';
import type { CheckIn as CheckInT, Note, Rating, Slot } from '@/types';

// Pulse check-in: rate today's places and moments on the battery. Pupils rate places, not feelings.
// Each place can have an optional note. Saving again on the same day updates today's check-in.
export default function CheckIn() {
  const { t, colors, db, me, update } = useApp();
  const router = useRouter();
  const today = todayISO();
  const existing = me ? db.checkins.find((c) => c.pupilId === me.id && c.date === today) : undefined;
  const [ratings, setRatings] = useState<CheckInT['ratings']>(existing?.ratings ?? {});
  const [notes, setNotes] = useState<CheckInT['notes']>(existing?.notes ?? {});
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<{ flagged: boolean } | null>(null);
  if (!me) return null;

  const { base, pins } = slotsFor(db, me);
  const a = avg(Object.values(ratings));
  const charge = a == null ? null : a / 5;

  const setR = (sid: string, v: Rating | null) =>
    setRatings((r) => {
      const n = { ...r };
      if (v) n[sid] = v;
      else delete n[sid];
      return n;
    });
  const setN = (sid: string, n: Note) => setNotes((x) => ({ ...x, [sid]: n }));

  const save = () => {
    // drop empty notes so "Add more" opened by accident doesn't count as a note
    const kept = Object.fromEntries(Object.entries(notes).filter(([, n]) => hasNote(n)));
    const flagged = update((d) => saveCheckIn(d, me.id, today, ratings, kept, existing?.id));
    setDone({ flagged });
  };

  if (done)
    return (
      <Screen belowBar>
        <View style={styles.stage}>
          <Zip charge={charge} colour={me.buddy.colour} hat={me.buddy.hat} size={120} />
          <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
            <H1>{t('saved')}</H1>
            {charge != null && <Text style={{ color: colors.ink, fontSize: 18 }}>{t('zipCharge', { p: Math.round(charge * 100) })}</Text>}
          </View>
        </View>
        {done.flagged && <Banner kind="info">{t('thanksSafe')}</Banner>}
        <Row>
          <Button label={t('home')} kind="primary" large onPress={() => router.back()} />
        </Row>
      </Screen>
    );

  const slotCard = (s: Slot | PinSlot, pin?: PinSlot) => {
    const isOpen = open === s.id;
    return (
      <View key={s.id} accessibilityLabel={s.name} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.head}>
          <View style={[styles.ic, { backgroundColor: colors.surface2 }]}>
            {pin ? <Text style={{ fontSize: 24 }}>{pin.emoji}</Text> : <Icon name={(s as Slot).icon as IconName} size={26} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.ink }]}>{s.name}</Text>
            {pin ? (
              <Text style={{ color: colors.ink2, fontSize: 14 }}>{t(pin.place === 'drains' ? 'drains' : 'recharges')}</Text>
            ) : (
              <Text style={{ color: colors.ink2, fontSize: 14 }}>{(s as Slot).time + ' · ' + (s as Slot).place}</Text>
            )}
          </View>
        </View>
        <Battery value={ratings[s.id]} onChange={(v) => setR(s.id, v)} label={s.name} />
        <Row>
          <Button label={isOpen ? t('close') : t('addMore')} onPress={() => setOpen(isOpen ? null : s.id)} />
          {hasNote(notes[s.id]) && !isOpen && <Text style={{ color: colors.okInk, fontWeight: '700' }}>✓ {t('attached')}</Text>}
        </Row>
        {isOpen && <NotePanel value={notes[s.id] ?? emptyNote()} onChange={(n) => setN(s.id, n)} />}
      </View>
    );
  };

  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <View style={[styles.stage, styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Zip charge={charge} colour={me.buddy.colour} hat={me.buddy.hat} size={80} />
        <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
          <H1>{t('checkIn')}</H1>
          <Text style={{ color: colors.ink }}>{charge == null ? t('zipEmpty') : t('zipCharge', { p: Math.round(charge * 100) })}</Text>
          <Muted small>{t('today') + ': ' + date + ' · ' + t('howCharged')}</Muted>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{t('rateOneOrMore')}</Text>
        </View>
      </View>
      {base.map((s) => slotCard(s))}
      {pins.length > 0 && <Text style={[styles.h2, { color: colors.ink }]}>{t('yourPlaces')}</Text>}
      {pins.map((s) => slotCard(s, s))}
      <Row>
        <Button label={t('save')} kind="primary" large disabled={!Object.keys(ratings).length} onPress={save} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ic: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '700' },
});
