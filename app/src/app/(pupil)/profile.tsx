import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Banner, Button, Checkbox, H1, Muted, OptionalWords, Row, Screen } from '@/components/ui';
import { addOwnWords, approveProfile, syncProfile, toggleProfileItem } from '@/domain/profile';
import { raiseFlag } from '@/domain/safeguarding';
import type { TextKey } from '@/i18n';
import { useApp } from '@/state/AppContext';
import type { ProfileSection } from '@/types';

// My Recharge Profile: built from the pupil's own ratings, symbols, places and words.
// The pupil hides what they don't want shown, adds their own words, and must tap Approve before staff see it.
const SECTIONS: [ProfileSection, IconName, TextKey][] = [
  ['drains', 'battery', 'drains'],
  ['helps', 'heart', 'helpsMe'],
  ['words', 'message', 'inMyWords'],
];

export default function MyProfile() {
  const { t, colors, db, me, update, save } = useApp();
  const router = useRouter();
  const [extra, setExtra] = useState('');
  // pick up anything new from check-ins, symbols and Walk places
  useEffect(() => {
    if (me) update((d) => syncProfile(d, me.id));
  }, []);
  if (!me) return null;
  const prof = db.profiles[me.id] ?? { items: [], approvedSnapshot: null, dirty: false, approvedAt: null };
  const approved = !!prof.approvedSnapshot && !prof.dirty;

  const addOwn = async () => {
    const text = extra.trim();
    if (!text) return;
    const res = await save((d) => {
      addOwnWords(d, me.id, text);
      raiseFlag(d, me.id, 'Profile words', text);
    });
    if (res.ok) setExtra('');
  };

  return (
    <Screen belowBar>
      <Row>
        <Button icon="home" label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('profile')}</H1>
      {approved ? (
        <Banner kind="ok">{t('approved')}</Banner>
      ) : prof.dirty ? (
        <Banner kind="info">{t('changed')}</Banner>
      ) : (
        <Banner kind="info">{t('notApproved')}</Banner>
      )}

      {SECTIONS.map(([k, icon, label]) => {
        const items = prof.items.filter((i) => i.section === k);
        return (
          <View key={k} accessibilityLabel={t(label)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Row style={{ gap: 8 }}>
              <Icon name={icon} />
              <Text accessibilityRole="header" style={[styles.h2, { color: colors.ink }]}>{t(label)}</Text>
            </Row>
            {items.length === 0 && <Muted>{t('nothing')}</Muted>}
            {items.map((i) => (
              <View key={i.id} style={[styles.item, { borderColor: colors.line, opacity: i.hidden ? 0.5 : 1 }]}>
                <Text style={[styles.itemText, { color: colors.ink, textDecorationLine: i.hidden ? 'line-through' : 'none' }]}>{i.text}</Text>
                <Button
                  icon={i.hidden ? 'eye' : 'eyeOff'}
                  label={i.hidden ? t('show') : t('hide')}
                  accessibilityLabel={(i.hidden ? t('show') : t('hide')) + ': ' + i.text}
                  onPress={() => update((d) => toggleProfileItem(d, me.id, i.id))}
                />
              </View>
            ))}
            {k === 'words' && (
              <View style={{ gap: 8 }}>
                <OptionalWords value={extra} onChange={setExtra} onSubmit={addOwn} label={t('addOwn')} multiline={false} />
                {!!extra.trim() && <Button icon="plus" label={t('add')} onPress={addOwn} style={{ alignSelf: 'flex-start' }} />}
              </View>
            )}
          </View>
        );
      })}

      <Row>
        <Button icon="check" label={t('approve')} kind="primary" large disabled={approved} onPress={() => update((d) => approveProfile(d, me.id))} />
      </Row>

      <Checkbox
        label={t('shareHome')}
        checked={me.parentShare}
        onChange={(v) =>
          update((d) => {
            d.pupils.find((p) => p.id === me.id)!.parentShare = v;
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  h2: { fontSize: 20, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10, flexWrap: 'wrap' },
  itemText: { flex: 1, minWidth: 160, fontSize: 16 },
  input: { flexGrow: 1, flexBasis: 200, minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
