import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, H2, Pill, fmtTime } from '@/components/staff/StaffUi';
import { Avatar, Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Access } from '@/domain/access';
import { SAFEGUARDING_CHECKLIST, setFlagStatus, toggleCheck } from '@/domain/staff';
import { useApp } from '@/state/AppContext';

// Safeguarding: keyword flags for a human (the DSL) to review, with the school's checklist.
// Recharge only spots words. It never judges risk or interprets images. Others see who to go to instead.
export default function Safeguarding() {
  const { db, staffMe, update, colors } = useApp();
  if (!staffMe) return null;

  if (!Access.canSeeSafeguarding(staffMe)) {
    const dsl = db.staff.find((s) => s.role === 'dsl');
    return (
      <Screen wide belowBar>
        <H1>Safeguarding</H1>
        <Card>
          <Text style={{ color: colors.ink, fontSize: 16 }}>
            {"If a pupil's words contain concerning keywords, Recharge sends them straight to the safeguarding lead" + (dsl ? ', ' + dsl.name : '') + '. Only they see the flags.'}
          </Text>
          <Muted>If you are worried about a pupil right now, follow your school's safeguarding policy and speak to the DSL in person. Recharge does not replace that.</Muted>
        </Card>
      </Screen>
    );
  }

  const flags = [...db.flags].sort((a, b) => (a.status === b.status ? b.at - a.at : a.status === 'open' ? -1 : 1));

  return (
    <Screen wide belowBar>
      <H1>Safeguarding</H1>
      <Banner kind="info">
        Keyword flags, for a human to review. Recharge spots words such as hurt, unsafe or self-harm. It doesn't judge risk or interpret images. Follow your
        school's safeguarding policy.
      </Banner>
      {flags.length === 0 && (
        <Card>
          <Muted>No flags.</Muted>
        </Card>
      )}
      {flags.map((f) => {
        const p = db.pupils.find((x) => x.id === f.pupilId);
        const done = SAFEGUARDING_CHECKLIST.filter(([k]) => f.checklist[k]).length;
        const all = done === SAFEGUARDING_CHECKLIST.length;
        return (
          <Card key={f.id} style={{ borderLeftWidth: 6, borderLeftColor: f.status === 'open' ? colors.lo : colors.hi }}>
            <Row>
              {p && <Avatar pupil={p} size={44} />}
              <View style={{ flex: 1, minWidth: 200 }}>
                <H2>{p?.name ?? 'Pupil'}</H2>
                <Muted small>{fmtTime(f.at) + ' · ' + f.source}</Muted>
              </View>
              <Pill text={(f.status === 'open' ? 'Open' : 'Closed') + ' · ' + done + '/' + SAFEGUARDING_CHECKLIST.length} kind={f.status === 'open' ? 'lo' : 'hi'} />
            </Row>
            <View style={[styles.quote, { backgroundColor: colors.surface2 }]}>
              <Text style={{ color: colors.ink, fontSize: 17 }}>{'"' + f.text + '"'}</Text>
              <Muted small>{'Matched: ' + f.words.join(', ')}</Muted>
            </View>
            <View style={{ gap: 6 }}>
              {SAFEGUARDING_CHECKLIST.map(([k, label]) => {
                const on = !!f.checklist[k];
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => update((d) => toggleCheck(d, f.id, k))}
                    style={[styles.check, { borderColor: colors.line, backgroundColor: colors.surface }]}>
                    <View style={[styles.box, { borderColor: colors.accent, backgroundColor: on ? colors.accent : 'transparent' }]}>
                      {on && <Text style={{ color: colors.accentInk, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.ink, flexShrink: 1 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Row>
              {f.status === 'open' ? (
                <>
                  <Button label="Close flag" kind="primary" disabled={!all} onPress={() => update((d) => setFlagStatus(d, f.id, 'closed'))} />
                  {!all && <Muted small>Tick every step to close.</Muted>}
                </>
              ) : (
                <Button label="Reopen" onPress={() => update((d) => setFlagStatus(d, f.id, 'open'))} />
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  quote: { borderRadius: 12, padding: 12, gap: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
