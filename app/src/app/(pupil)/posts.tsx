import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { KIND, postDate } from '@/components/postMeta';
import { StatusBadge } from '@/components/StatusBadge';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { keyAdultName } from '@/domain/posts';
import { useApp } from '@/state/AppContext';

// My posts: everything the pupil has sent or kept, newest first, with its status and who can see it.
export default function MyPosts() {
  const { t, colors, db, me } = useApp();
  const router = useRouter();
  if (!me) return null;
  const posts = db.posts.filter((p) => p.pupilId === me.id).sort((a, b) => b.at - a.at);
  const adult = keyAdultName(db, me.id);

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('myPosts')}</H1>
      <Muted>{t('myPostsSub')}</Muted>
      {posts.length === 0 && <Muted>{t('noPosts')}</Muted>}
      {posts.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: pressed ? colors.accent : colors.line }]}>
          <View style={[styles.ic, { backgroundColor: colors.surface2 }]}>
            <Icon name={KIND[p.kind].icon} size={22} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.ink2, fontSize: 13 }}>{t(KIND[p.kind].label) + ' · ' + postDate(p.at)}</Text>
            <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 16 }}>{p.summary}</Text>
            <Row style={{ gap: 8 }}>
              {p.sharedWith === 'keyAdult' ? <StatusBadge post={p} /> : null}
              <Text style={{ color: colors.ink2, fontSize: 13 }}>
                {p.sharedWith === 'keyAdult' ? t('sharedWithAdult', { adult }) : '🔒 ' + t('keptPrivate')}
              </Text>
            </Row>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderRadius: 20, borderWidth: 1, padding: 14, alignItems: 'flex-start' },
  ic: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
