import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import type { Post } from '@/types';
import { Icon } from './Icon';
import { PictoChips, postPictos } from './Pictos';
import { KIND, postDate, replyTime } from './postMeta';
import { StatusBadge } from './StatusBadge';
import { Row } from './ui';

// One row in "Replies to me" and "What I've sent": what it was, when, any reply (with its time), its status and who can see it.
export function PostCard({ post, adult }: { post: Post; adult: string }) {
  const { t, colors, db } = useApp();
  const router = useRouter();
  const p = post;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: pressed ? colors.accent : colors.line }]}>
      <View style={[styles.ic, { backgroundColor: colors.surface2 }]}>
        <Icon name={KIND[p.kind].icon} size={22} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.ink2, fontSize: 13 }}>{t(KIND[p.kind].label) + ' · ' + postDate(p.at)}</Text>
        <PictoChips items={postPictos(db, p, t)} />
        <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 16 }}>{p.summary}</Text>
        {p.status === 'followUp' && !!p.followUp && (
          <View style={[styles.reply, { backgroundColor: colors.okBg }]}>
            <Text numberOfLines={2} style={{ color: colors.okInk, fontSize: 15 }}>{'↩ ' + p.followUp}</Text>
            {!!(p.repliedAt ?? p.readAt) && (
              <Text style={{ color: colors.okInk, fontSize: 13, fontWeight: '700' }}>{t('repliedAt', { when: replyTime((p.repliedAt ?? p.readAt)!) })}</Text>
            )}
          </View>
        )}
        <Row style={{ gap: 8 }}>
          {p.sharedWith === 'keyAdult' ? <StatusBadge post={p} /> : null}
          <Text style={{ color: colors.ink2, fontSize: 13 }}>
            {p.sharedWith === 'keyAdult' ? t('sharedWithAdult', { adult }) : '🔒 ' + t('keptPrivate')}
          </Text>
        </Row>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderRadius: 20, borderWidth: 1, padding: 14, alignItems: 'flex-start' },
  reply: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  ic: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
