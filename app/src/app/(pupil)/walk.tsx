import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhotoPicker } from '@/components/PhotoPicker';
import { PictoGrid, PictoHeading } from '@/components/Pictos';
import { Button, H1, InfoTip, OptionalWords, Row, Screen } from '@/components/ui';
import { CHIP_ICON, EMOJIS } from '@/data/vocab';
import { syncProfile } from '@/domain/profile';
import { addPost } from '@/domain/posts';
import { raiseFlag } from '@/domain/safeguarding';
import { uid } from '@/domain/util';
import { chips } from '@/i18n';
import { useApp } from '@/state/AppContext';
import type { Pin } from '@/types';

// Recharge Walk: once a term, photograph places around school and say if each drains or recharges you.
// The pupil's caption is the meaning; nobody guesses what a photo shows. Places become the pupil's own
// check-in places and appear in their profile.
export default function RechargeWalk() {
  const { t, colors, db, me, update, save: saveDb } = useApp();
  const router = useRouter();
  const mine = me ? db.pins.filter((p) => p.pupilId === me.id) : [];
  const [adding, setAdding] = useState(mine.length === 0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [tag, setTag] = useState<Pin['tag'] | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  // a picked phrase and/or the pupil's own words; both optional
  const [chip, setChip] = useState<string | null>(null);
  const [words, setWords] = useState('');
  if (!me) return null;
  const captionChips = chips('captionChips');

  const reset = () => {
    setAdding(false);
    setPhoto(null);
    setTag(null);
    setEmoji(null);
    setChip(null);
    setWords('');
  };

  const save = async () => {
    if (!tag) return;
    const res = await saveDb((d) => {
      const pin: Pin = {
        id: uid('pn'),
        pupilId: me.id,
        photo,
        tag,
        emoji: emoji ?? (tag === 'drains' ? '🔊' : '🌈'),
        // with no words, the pupil's own "drains / recharges" choice names the place (nothing is guessed for them)
        caption: [chip, words.trim()].filter(Boolean).join('. ') || t(tag),
        at: Date.now(),
      };
      d.pins.push(pin);
      // places stay private until the pupil approves their profile
      addPost(d, { pupilId: me.id, kind: 'pin', refId: pin.id, summary: pin.emoji + ' ' + pin.caption, sharedWith: 'private' });
      if (words.trim()) raiseFlag(d, me.id, 'Recharge Walk caption', words);
      syncProfile(d, me.id);
    });
    if (res.ok) reset(); // if not, the photo, tag and caption stay with the message
  };

  const removePin = (id: string) =>
    update((d) => {
      d.pins = d.pins.filter((p) => p.id !== id);
      d.posts = d.posts.filter((p) => !(p.kind === 'pin' && p.refId === id));
    });

  const tagBtn = (v: Pin['tag']) => {
    const on = tag === v;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        onPress={() => setTag(v)}
        style={[styles.tagBtn, { borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
        <View style={[styles.tagIc, { backgroundColor: v === 'drains' ? colors.loBg : colors.hiBg }]}>
          <Text style={{ fontSize: 22 }}>{v === 'drains' ? '🪫' : '🔋'}</Text>
        </View>
        <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 17 }}>{t(v)}</Text>
      </Pressable>
    );
  };

  return (
    <Screen belowBar>
      <Row>
        <Button icon="back" label={t('back')} onPress={() => router.back()} />
      </Row>
      <H1>{t('walk')}</H1>
      <InfoTip text={t('walkIntro')} />

      {mine.length > 0 && (
        <View style={styles.pins}>
          {mine.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.media, { backgroundColor: colors.surface2 }]}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} accessibilityLabel={p.caption} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 52 }}>{p.emoji}</Text>
                )}
              </View>
              <Row>
                <View style={[styles.pill, { backgroundColor: p.tag === 'drains' ? colors.loBg : colors.hiBg }]}>
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 13 }}>{t(p.tag)}</Text>
                </View>
                <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
              </Row>
              <Text style={{ color: colors.ink, fontSize: 16 }}>{p.caption}</Text>
              <Button icon="del" label={t('remove')} kind="quiet" onPress={() => removePin(p.id)} style={{ alignSelf: 'flex-start' }} />
            </View>
          ))}
        </View>
      )}

      {!adding && (
        <Row>
          <Button icon="plus" label={t('addPlace')} kind="primary" large onPress={() => setAdding(true)} />
        </Row>
      )}

      {adding && (
        <View accessibilityLabel={t('addPlace')} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.h2, { color: colors.ink }]}>{t('addPlace')}</Text>
          <PhotoPicker value={photo} onChange={setPhoto} />

          <View accessibilityRole="radiogroup" accessibilityLabel="Drains or recharges" style={styles.tagRow}>
            {tagBtn('drains')}
            {tagBtn('recharges')}
          </View>

          <PictoHeading icon="image" label={t('pickEmoji')} />
          <View style={styles.emojis}>
            {EMOJIS.map((e) => {
              const on = emoji === e;
              return (
                <Pressable
                  key={e}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={'Emoji ' + e}
                  onPress={() => setEmoji(e)}
                  style={[styles.emojiBtn, { borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </Pressable>
              );
            })}
          </View>

          <PictoHeading icon="message" label={t('caption') + ' (' + t('optional') + ')'} />
          <PictoGrid
            size="sm"
            single
            items={captionChips.map((c) => ({ key: c, icon: CHIP_ICON[c] ?? 'message', label: c }))}
            picked={chip ? [chip] : []}
            onToggle={(c) => setChip(chip === c ? null : c)}
          />
          <OptionalWords value={words} onChange={setWords} label={t('caption')} multiline={false} />

          <Row>
            <Button icon="check" label={t('savePlace')} kind="primary" large disabled={!tag} onPress={save} />
            {mine.length > 0 && <Button icon="x" label={t('close')} onPress={reset} />}
          </Row>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pins: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 220, borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  media: { aspectRatio: 4 / 3, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  h2: { fontSize: 22, fontWeight: '700' },
  lbl: { fontSize: 16, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagBtn: { flexGrow: 1, flexBasis: 150, minHeight: 104, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tagIc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
