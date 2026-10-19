import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FeedList } from '@/components/FeedList';
import { PostCard } from '@/components/PostCard';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { keyAdultName } from '@/domain/posts';
import { useApp } from '@/state/AppContext';

// See my teacher's response: everything about the pupil and the adults in one place.
// Replies to me · What I've sent (breaks, talk requests, symbols, notes, places) · You said, we did.
type Tab = 'replies' | 'sent' | 'feed';

export default function Responses() {
  const { t, colors, db, me } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: Tab; at?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'sent' || params.tab === 'feed' ? params.tab : 'replies');
  // the break pop-up's link opens this screen on "What I've sent", even if it's already open on another tab
  // ("at" changes on every tap, so the tab switches again)
  useEffect(() => {
    if (params.tab === 'sent' || params.tab === 'feed' || params.tab === 'replies') setTab(params.tab);
  }, [params.tab, params.at]);
  if (!me) return null;
  const adult = keyAdultName(db, me.id);
  const all = db.posts.filter((p) => p.pupilId === me.id).sort((a, b) => b.at - a.at);
  const replies = all.filter((p) => p.sharedWith === 'keyAdult' && p.status === 'followUp');

  const tabBtn = (k: Tab, label: string) => {
    const on = tab === k;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => setTab(k)}
        style={[styles.tab, { backgroundColor: on ? colors.accent : colors.surface, borderColor: on ? colors.accent : colors.line }]}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: on ? colors.accentInk : colors.ink }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('teacherResponse')}</H1>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabBtn('replies', t('repliesTab'))}
        {tabBtn('sent', t('sentTab'))}
        {tabBtn('feed', t('feedTab'))}
      </View>

      {tab === 'replies' ? (
        <View style={{ gap: 12 }}>
          {replies.length === 0 && <Muted>{t('noReplies', { adult })}</Muted>}
          {replies.map((p) => (
            <PostCard key={p.id} post={p} adult={adult} />
          ))}
        </View>
      ) : tab === 'sent' ? (
        <View style={{ gap: 12 }}>
          <Muted>{t('sentIntro')}</Muted>
          {all.length === 0 && <Muted>{t('noPosts')}</Muted>}
          {all.map((p) => (
            <PostCard key={p.id} post={p} adult={adult} />
          ))}
        </View>
      ) : (
        <FeedList />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { minHeight: 52, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
});
