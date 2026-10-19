import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setHelpful } from '@/domain/themes';
import { useApp } from '@/state/AppContext';
import type { Helpful } from '@/types';
import { Icon } from './Icon';
import { Muted, Row } from './ui';

// You said, we did: changes the school made because of what pupils said, with an optional "Was this helpful?".
export function FeedList() {
  const { t, colors, db, me, update } = useApp();
  if (!me) return null;
  const items = db.feed.filter((f) => f.classId === me.classId).sort((a, b) => b.at - a.at);

  const answerBtn = (feedId: string, current: Helpful | undefined, value: Helpful, label: string) => {
    const on = current === value;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        onPress={() => update((d) => setHelpful(d, feedId, me.id, value))}
        style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surface2 }]}>
        <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{(on ? '✓ ' : '') + label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 16 }}>
      {items.length === 0 && <Muted>{t('nothing')}</Muted>}
      {items.map((f) => {
        const mine = f.helpful[me.id];
        const day = new Date(f.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        return (
          <View key={f.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Muted small>{day + ' · ' + f.by}</Muted>
            <View style={[styles.said, { backgroundColor: colors.surface2 }]}>
              <Row style={{ gap: 6 }}>
                <Icon name="message" size={16} color={colors.ink2} />
                <Text style={[styles.eyebrow, { color: colors.ink2 }]}>{t('youSaid').toUpperCase()}</Text>
              </Row>
              <Text style={[styles.body, { color: colors.ink }]}>{f.said}</Text>
            </View>
            <View style={[styles.said, { backgroundColor: colors.okBg }]}>
              <Row style={{ gap: 6 }}>
                <Icon name="check" size={16} color={colors.okInk} />
                <Text style={[styles.eyebrow, { color: colors.okInk }]}>{t('weDid').toUpperCase()}</Text>
              </Row>
              <Text style={[styles.body, { color: colors.okInk }]}>{f.did}</Text>
            </View>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('wasHelpful')} style={{ gap: 8 }}>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{t('wasHelpful')}</Text>
              <Row style={{ gap: 8 }}>
                {answerBtn(f.id, mine, 'yes', t('helpfulYes'))}
                {answerBtn(f.id, mine, 'notReally', t('helpfulNo'))}
              </Row>
              {!!mine && <Muted small>{t('helpfulThanks')}</Muted>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  said: { borderRadius: 14, padding: 12, gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  body: { fontSize: 18 },
  chip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
});
