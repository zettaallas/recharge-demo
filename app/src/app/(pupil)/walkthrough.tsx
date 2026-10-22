import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Button, Row, Screen } from '@/components/ui';
import { keyAdultName } from '@/domain/posts';
import type { TextKey } from '@/i18n';
import { useApp } from '@/state/AppContext';

// A short walkthrough: four cards, Skip on every one. Shown once after personalising, and any time from Settings.
const CARDS: { icon: IconName; title: TextKey; body: TextKey }[] = [
  { icon: 'heart', title: 'wt1Title', body: 'wt1Body' },
  { icon: 'message', title: 'wt2Title', body: 'wt2Body' },
  { icon: 'lock', title: 'wt3Title', body: 'wt3Body' },
  { icon: 'bell', title: 'wt4Title', body: 'wt4Body' },
];

export default function Walkthrough() {
  const { t, colors, db, me, update } = useApp();
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const [i, setI] = useState(0);
  if (!me) return null;
  const adult = keyAdultName(db, me.id);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;
  const accents = [colors.accent, colors.break, colors.hi, colors.mid];

  // skipping counts as done, so it is never forced on the pupil again
  const finish = () => {
    update((d) => {
      d.pupils.find((x) => x.id === me.id)!.settings.walkthroughDone = true;
    });
    if (replay) router.back();
    else router.replace('/home');
  };

  return (
    <Screen belowBar>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.ink2, fontWeight: '700' }}>{t('wtStep', { n: i + 1, total: CARDS.length })}</Text>
        <Button label={t('wtSkip')} kind="quiet" onPress={finish} />
      </Row>

      <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: colors.surface, borderColor: accents[i] }]}>
        <View style={[styles.ic, { backgroundColor: accents[i] }]}>
          <Icon name={card.icon} size={44} color={i === 3 ? colors.zipLine : colors.surface} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t(card.title)}</Text>
        <Text style={[styles.body, { color: colors.ink }]}>{t(card.body, { adult })}</Text>
      </View>

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {CARDS.map((_, k) => (
          <View key={k} style={[styles.dot, { backgroundColor: k === i ? colors.accent : colors.line }]} />
        ))}
      </View>

      <Row>
        {i > 0 && <Button icon="back" label={t('back')} onPress={() => setI(i - 1)} />}
        <Button icon={last ? 'check' : 'next'} label={last ? t('wtStart') : t('wtNext')} kind="primary" large onPress={() => (last ? finish() : setI(i + 1))} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 2, padding: 24, gap: 14, alignItems: 'center' },
  ic: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 18, lineHeight: 26, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
