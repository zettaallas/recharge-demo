import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Sparkline } from '@/components/Sparkline';
import { NoteView } from '@/components/staff/NoteView';
import { Card, H2, fmtTime } from '@/components/staff/StaffUi';
import { Avatar, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Access, sharedNotes } from '@/domain/access';
import { pupilSeries } from '@/domain/checkins';
import { useApp } from '@/state/AppContext';

// One pupil, for their key adult or the SENCO: battery trend, the profile they approved,
// recent notes they shared, and notes from home only if they agreed.
export default function PupilDetail() {
  const { db, staffMe, colors } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = db.pupils.find((x) => x.id === id);
  if (!staffMe) return null;
  if (!p || !Access.canSeePupilDetail(staffMe, p)) return <Redirect href="/overview" />;
  const s = pupilSeries(db, p.id);
  const prof = Access.profile(db, p);
  // notes (check-in and from home) are for the key adult only; the SENCO sees drift and the approved profile
  const canNotes = Access.canSeeNotes(staffMe, p);
  const home = canNotes ? Access.parentNotes(db, p) : null;
  const notes = canNotes ? sharedNotes(db, p.id, 6) : [];
  const first = p.name.split(' ')[0];
  const sections: [string, string][] = [
    ['drains', 'Drains me'],
    ['helps', 'Helps me'],
    ['words', 'In my words'],
  ];

  return (
    <Screen wide belowBar>
      <Row>
        <Button label="Back" onPress={() => router.back()} />
      </Row>
      <Row>
        <Avatar pupil={p} size={56} />
        <View style={{ gap: 2 }}>
          <H1>{p.name}</H1>
          <Muted small>{'Attendance ' + p.attendance + '% · key adult ' + (db.staff.find((x) => x.id === p.keyAdultId)?.name ?? '')}</Muted>
        </View>
      </Row>

      <Card>
        <H2>Battery trend</H2>
        <Sparkline values={s.map((x) => x.avg)} w={300} h={64} />
      </Card>

      <Card>
        <H2>Recharge Profile</H2>
        {prof ? (
          sections.map(([k, l]) => {
            const items = prof.filter((i) => i.section === k);
            return (
              <View key={k} style={{ gap: 4 }}>
                <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{l.toUpperCase()}</Text>
                {items.length === 0 ? <Muted small>–</Muted> : items.map((i, j) => <Text key={j} style={{ color: colors.ink }}>{'• ' + i.text}</Text>)}
              </View>
            );
          })
        ) : (
          <Muted>{'Not approved yet. Only ' + first + ' can see it until they approve it.'}</Muted>
        )}
      </Card>

      {canNotes ? (
        <>
          <Card>
            <H2>Recent notes</H2>
            <Muted small>{'Only notes ' + first + ' shared. Notes they kept private are not shown.'}</Muted>
            {notes.length ? notes.map((n, i) => <NoteView key={i} item={n} />) : <Muted>No notes.</Muted>}
          </Card>

          <Card>
            <H2>Notes from home</H2>
            {home == null ? (
              <Muted>{'Hidden. ' + first + ' has not agreed to share notes from home.'}</Muted>
            ) : home.length ? (
              home.map((n) => (
                <View key={n.id} style={{ gap: 2 }}>
                  <Muted small>{fmtTime(n.at)}</Muted>
                  <Text style={{ color: colors.ink }}>{n.text}</Text>
                </View>
              ))
            ) : (
              <Muted>None yet.</Muted>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <Muted>{first + "'s notes go to their key adult only. You see the battery trend and the approved profile."}</Muted>
        </Card>
      )}
    </Screen>
  );
}
