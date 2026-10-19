import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, H2, fmtTime } from '@/components/staff/StaffUi';
import { useStaffClass } from '@/components/staff/StaffClass';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Access } from '@/domain/access';
import { postYouSaidWeDid } from '@/domain/staff';
import { groupThemes, helpAnswers, helpfulTally } from '@/domain/themes';
import { useApp } from '@/state/AppContext';

// You said, we did: tell the class what changed because of what they said. Each post shows how many pupils found it helpful.
export default function YouSaidWeDid() {
  const { db, staffMe, update, colors } = useApp();
  const { classId } = useStaffClass();
  const [said, setSaid] = useState('');
  const [did, setDid] = useState('');
  const [posted, setPosted] = useState(false);
  if (!staffMe || !classId) return null;
  if (!Access.canManage(staffMe))
    return (
      <Screen wide belowBar>
        <H1>You said, we did</H1>
        <Muted>Class teachers and the SENCO post these.</Muted>
      </Screen>
    );
  const pupils = db.pupils.filter((p) => p.classId === classId);
  const top = groupThemes(helpAnswers(db, new Set(pupils.map((p) => p.id))))
    .filter((g) => g.id !== 'other')
    .slice(0, 4)
    .map((g) => g.label);
  const posts = db.feed.filter((f) => f.classId === classId).sort((a, b) => b.at - a.at);
  const input = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }];

  const post = () => {
    update((d) => postYouSaidWeDid(d, classId, staffMe, said, did));
    setSaid('');
    setDid('');
    setPosted(true);
  };

  return (
    <Screen wide belowBar>
      <H1>You said, we did</H1>
      <View style={styles.cols}>
        <Card style={styles.col}>
          <H2>Tell pupils what changed</H2>
          <Text style={[styles.lbl, { color: colors.ink }]}>You said</Text>
          <Muted small>The most asked for themes in this class:</Muted>
          <View style={styles.chips}>
            {top.map((tp) => (
              <Pressable
                key={tp}
                accessibilityRole="radio"
                accessibilityState={{ checked: said === tp }}
                onPress={() => setSaid(tp)}
                style={[styles.chip, { backgroundColor: said === tp ? colors.accent : colors.surface2 }]}>
                <Text style={{ fontWeight: '700', color: said === tp ? colors.accentInk : colors.ink }}>{tp}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={said} onChangeText={(v) => { setSaid(v); setPosted(false); }} placeholder="For example: The lunch hall is too loud." placeholderTextColor={colors.ink2} accessibilityLabel="You said" style={input} />
          <Text style={[styles.lbl, { color: colors.ink }]}>We did</Text>
          <TextInput multiline value={did} onChangeText={(v) => { setDid(v); setPosted(false); }} placeholder="Say what changed, when, and where. Keep it short and concrete." placeholderTextColor={colors.ink2} accessibilityLabel="We did" style={[input, { minHeight: 96, textAlignVertical: 'top' }]} />
          <Row>
            <Button label="Post to class feed" kind="primary" disabled={!said.trim() || !did.trim()} onPress={post} />
          </Row>
          {posted && <Banner kind="ok">Posted. Pupils see it in "See my teacher's response".</Banner>}
        </Card>

        <View style={[styles.col, { gap: 12 }]}>
          <H2>Posted</H2>
          {posts.map((f) => {
            const tally = helpfulTally(f);
            return (
              <Card key={f.id}>
                <Muted small>{fmtTime(f.at) + ' · ' + f.by}</Muted>
                <View style={[styles.box, { backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.eyebrow, { color: colors.ink2 }]}>YOU SAID</Text>
                  <Text style={{ color: colors.ink, fontSize: 16 }}>{f.said}</Text>
                </View>
                <View style={[styles.box, { backgroundColor: colors.okBg }]}>
                  <Text style={[styles.eyebrow, { color: colors.okInk }]}>WE DID</Text>
                  <Text style={{ color: colors.okInk, fontSize: 16 }}>{f.did}</Text>
                </View>
                <Text style={{ color: colors.ink }}>
                  <Text style={{ fontWeight: '700' }}>Was this helpful? </Text>
                  {tally.yes + ' yes · ' + tally.notReally + ' not really · ' + (pupils.length - tally.yes - tally.notReally) + ' no answer'}
                </Text>
              </Card>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexBasis: 340 },
  lbl: { fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  box: { borderRadius: 12, padding: 10, gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
