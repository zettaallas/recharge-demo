import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KIND, postDate, replyTime } from '@/components/postMeta';
import { StatusBadge } from '@/components/StatusBadge';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { keyAdultName, setPostHelpful, setShared, visibleStatus } from '@/domain/posts';
import { useApp } from '@/state/AppContext';
import type { Helpful } from '@/types';

// One post: what was sent, its status, any reply, and the pupil's choice to share it or keep it private.
export default function PostDetail() {
  const { t, colors, db, me, update } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = db.posts.find((p) => p.id === id && p.pupilId === me?.id);
  if (!me) return null;
  if (!post) return <Redirect href="/responses" />;
  const adult = keyAdultName(db, me.id);
  const shared = post.sharedWith === 'keyAdult';
  const status = visibleStatus(post, me.settings.showReadReceipts);

  const helpfulBtn = (value: Helpful, label: string) => {
    const on = post.helpful === value;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        onPress={() => update((d) => setPostHelpful(d, post.id, value))}
        style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surface2 }]}>
        <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{(on ? '✓ ' : '') + label}</Text>
      </Pressable>
    );
  };

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('back')} onPress={() => router.back()} />
      </Row>
      <Muted small>{t(KIND[post.kind].label) + ' · ' + postDate(post.at)}</Muted>
      <H1>{post.summary}</H1>

      {shared ? (
        <View style={{ gap: 8 }}>
          <StatusBadge post={post} />
          {status !== 'sent' && post.readAt && (
            <Muted small>{t('statusRead') + ' · ' + postDate(post.readAt)}</Muted>
          )}
        </View>
      ) : (
        <Banner kind="info">{'🔒 ' + t('keptPrivate')}</Banner>
      )}

      {post.status === 'followUp' && post.followUp && (
        <View style={[styles.reply, { backgroundColor: colors.okBg }]}>
          <Text style={[styles.eyebrow, { color: colors.okInk }]}>{t('replyFrom').toUpperCase()}</Text>
          <Text style={{ color: colors.okInk, fontSize: 18 }}>{post.followUp}</Text>
          {!!(post.repliedAt ?? post.readAt) && (
            <Text style={{ color: colors.okInk, fontSize: 14, fontWeight: '700' }}>{t('repliedAt', { when: replyTime((post.repliedAt ?? post.readAt)!) })}</Text>
          )}
          <Text style={{ color: colors.okInk, fontWeight: '700', marginTop: 6 }}>{t('wasHelpful')}</Text>
          <Row style={{ gap: 8 }}>
            {helpfulBtn('yes', t('helpfulYes'))}
            {helpfulBtn('notReally', t('helpfulNo'))}
          </Row>
          {!!post.helpful && <Text style={{ color: colors.okInk, fontSize: 14 }}>{t('helpfulThanks')}</Text>}
        </View>
      )}

      <View style={{ gap: 8 }}>
        {shared ? (
          <>
            <Row>
              <Button label={t('unshare')} onPress={() => update((d) => setShared(d, post.id, false))} />
            </Row>
            <Muted small>{t('unshareNote')}</Muted>
          </>
        ) : (
          <Row>
            <Button label={t('shareIt', { adult })} kind="primary" onPress={() => update((d) => setShared(d, post.id, true))} />
          </Row>
        )}
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  reply: { borderRadius: 16, padding: 14, gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  chip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
});
