import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { replyTime } from '@/components/postMeta';
import { Card, Pill, fmtTime } from '@/components/staff/StaffUi';
import { Avatar, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Access, inboxFor } from '@/domain/access';
import { markRead, replyToPost } from '@/domain/staff';
import { useApp } from '@/state/AppContext';
import type { Post } from '@/types';

// Requests: what the key adult's pupils chose to share with them (breaks, talk requests, symbols, notes, places).
// Newest first, unread first. Mark read, tap a quick reply, or write a reply. Private posts never appear here.
type Filter = 'new' | 'all';

export default function Requests() {
  const { db, staffMe } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('new');
  if (!staffMe) return null;
  const all = inboxFor(db, staffMe);
  const shown = filter === 'new' ? all.filter((p) => p.status === 'sent') : all;

  return (
    <Screen wide belowBar>
      <H1>Requests</H1>
      <Muted>What your pupils chose to share with you. They see when you've read it and any reply you send.</Muted>
      <Row>
        <Button label={'New (' + all.filter((p) => p.status === 'sent').length + ')'} kind={filter === 'new' ? 'primary' : 'default'} onPress={() => setFilter('new')} />
        <Button label={'All (' + all.length + ')'} kind={filter === 'all' ? 'primary' : 'default'} onPress={() => setFilter('all')} />
        <Button label="Edit my quick replies" kind="quiet" onPress={() => router.navigate('/quick-replies')} />
      </Row>
      {shown.length === 0 && (
        <Card>
          <Muted>{filter === 'new' ? 'Nothing new. You are up to date.' : 'Nothing shared with you yet.'}</Muted>
        </Card>
      )}
      {shown.map((p) => (
        <RequestCard key={p.id} post={p} />
      ))}
    </Screen>
  );
}

function RequestCard({ post }: { post: Post }) {
  const { db, staffMe, update, colors } = useApp();
  const [text, setText] = useState('');
  const pupil = db.pupils.find((x) => x.id === post.pupilId);
  if (!pupil || !staffMe || !Access.canReply(staffMe, pupil)) return null;
  const send = (words: string) => {
    update((d) => replyToPost(d, post.id, staffMe, words));
    setText('');
  };
  const statusPill = post.status === 'followUp' ? <Pill text="↩ Replied" kind="hi" /> : post.status === 'read' ? <Pill text="✓✓ Read" /> : <Pill text="New" kind="mid" />;

  return (
    <Card style={post.status === 'sent' ? { borderLeftWidth: 6, borderLeftColor: colors.mid } : undefined}>
      <Row>
        <Avatar pupil={pupil} size={44} />
        <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{pupil.name}</Text>
          <Muted small>{labelFor(post) + ' · ' + fmtTime(post.at)}</Muted>
        </View>
        {statusPill}
      </Row>
      <Text style={{ color: colors.ink, fontSize: 17 }}>{post.summary}</Text>

      {post.status === 'followUp' && post.followUp ? (
        <View style={[styles.reply, { backgroundColor: colors.okBg }]}>
          <Text style={{ color: colors.okInk, fontSize: 16 }}>{post.followUp}</Text>
          {!!post.repliedAt && <Text style={{ color: colors.okInk, fontWeight: '700', fontSize: 13 }}>{'Replied ' + replyTime(post.repliedAt)}</Text>}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>QUICK REPLY</Text>
          <View style={styles.chips}>
            {staffMe.quickReplies.map((q, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={'Send quick reply: ' + q}
                onPress={() => send(q)}
                style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? colors.accentSoft : colors.surface2 }]}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{q}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder={'Or write your own reply to ' + pupil.name.split(' ')[0]}
            placeholderTextColor={colors.ink2}
            accessibilityLabel={'Reply to ' + pupil.name}
            style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
          />
          <Row>
            <Button label="Send reply" kind="primary" disabled={!text.trim()} onPress={() => send(text)} />
            {post.status === 'sent' && <Button label="Mark as read" onPress={() => update((d) => markRead(d, post.id))} />}
          </Row>
        </View>
      )}
    </Card>
  );
}

function labelFor(p: Post): string {
  return { note: 'Check-in note', symbol: 'Symbols', break: 'Asked for a break', pin: 'Place', talk: 'Asked to talk' }[p.kind];
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, justifyContent: 'center', maxWidth: 420 },
  input: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  reply: { borderRadius: 14, padding: 12, gap: 4 },
});
