import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { Sparkline } from '@/components/Sparkline';
import { Heatmap } from '@/components/staff/Heatmap';
import { NoteView } from '@/components/staff/NoteView';
import { Card, H2, Stat, fmtDay } from '@/components/staff/StaffUi';
import { Avatar, Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Access, inboxFor, sharedNotes } from '@/domain/access';
import { pupilSeries } from '@/domain/checkins';
import { driftInfo } from '@/domain/drift';
import { planCheckIn } from '@/domain/staff';
import { useApp } from '@/state/AppContext';
import type { Pupil } from '@/types';

// Staff overview. Each role only sees its own parts: the heatmap (tutor, key adult, SENCO),
// drift alerts (key adult for their pupils, SENCO for all) and the requests count (key adult).
export default function Overview() {
  const { db, staffMe } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  if (!staffMe) return null;

  if (Access.canSeeSafeguarding(staffMe))
    return (
      <Screen wide belowBar>
        <H1>{staffMe.name}</H1>
        <Card>
          <H2>Safeguarding</H2>
          <Muted>
            As safeguarding lead you see flagged posts only. Pupils' other check-ins, notes and profiles stay with their key adult. The flags list
            and checklist arrive in Step 9b.
          </Muted>
          <Text>{'Open flags right now: ' + db.flags.filter((f) => f.status === 'open').length}</Text>
        </Card>
      </Screen>
    );

  const cls = staffMe.role === 'class_teacher' ? db.classes.find((c) => c.teacherId === staffMe.id) : db.classes[0];
  if (!cls) return null;
  const pupils = Access.visiblePupils(db, staffMe, cls.id);
  const canPick = (p: Pupil) => Access.canSeePupilDetail(staffMe, p);
  const ids = new Set(filter ? [filter] : pupils.map((p) => p.id));
  const lastDate = db.checkins.filter((c) => ids.has(c.pupilId)).map((c) => c.date).sort().pop();
  const checkedLast = lastDate ? new Set(db.checkins.filter((c) => c.date === lastDate && pupils.some((p) => p.id === c.pupilId)).map((c) => c.pupilId)).size : 0;
  const drifts = pupils
    .filter((p) => Access.canSeeDrift(staffMe, p))
    .map((p) => {
      const s = pupilSeries(db, p.id);
      return { p, s, d: driftInfo(s.map((x) => x.avg)) };
    })
    .filter((o) => o.d);
  const unread = inboxFor(db, staffMe).filter((p) => p.status === 'sent').length;
  const keyAdult = Access.hasKeyPupils(db, staffMe);

  return (
    <Screen wide belowBar>
      <H1>{'Class ' + cls.name}</H1>
      <View style={styles.stats}>
        <Stat label="Pupils you can see" n={pupils.length} />
        <Stat label={'Checked in ' + (lastDate ? fmtDay(lastDate) : '')} n={checkedLast} />
        {(keyAdult || staffMe.role === 'senco') && <Stat label="Drift alerts" n={drifts.length} alert={drifts.length > 0} />}
        {keyAdult && <Stat label="New requests" n={unread} alert={unread > 0} />}
      </View>

      {keyAdult && unread > 0 && (
        <Row>
          <Button label={'Open requests (' + unread + ' new)'} kind="primary" onPress={() => router.navigate('/requests')} />
        </Row>
      )}

      {Access.canSeeHeatmap(staffMe) && (
        <Card>
          <H2>Where energy goes</H2>
          <Muted small>Average battery per place and moment, last 6 check-in days. 5 = fully charged.</Muted>
          {/* only people who may see one pupil's data can narrow the heatmap to one pupil */}
          {pupils.some(canPick) && (
            <Dropdown
              label="Show"
              placeholder="Whole class"
              noneLabel="Whole class"
              options={pupils.filter(canPick).map((p) => ({ id: p.id, label: p.name }))}
              value={filter}
              onChange={setFilter}
            />
          )}
          <Heatmap db={db} classId={cls.id} pupilIds={ids} />
        </Card>
      )}

      {(keyAdult || staffMe.role === 'senco') && (
        <View style={{ gap: 12 }}>
          <H2>Drift alerts</H2>
          <Muted small>A pupil's average battery has fallen for 3 or more check-ins in a row. Only their key adult and the SENCO see this.</Muted>
          {drifts.length === 0 && (
            <Card>
              <Muted>No drift for the pupils you support.</Muted>
            </Card>
          )}
          {drifts.map(({ p, s, d }) => (
            <DriftCard key={p.id} p={p} values={s.map((x) => x.avg)} from={d!.from} to={d!.to} drops={d!.drops} />
          ))}
        </View>
      )}

      {staffMe.role === 'class_teacher' && (
        <Banner kind="info">
          As class teacher you see the whole class's places and moments. You see individual notes and requests only for pupils you are key
          adult for.
        </Banner>
      )}
    </Screen>
  );
}

function DriftCard({ p, values, from, to, drops }: { p: Pupil; values: (number | null)[]; from: number; to: number; drops: number }) {
  const { db, staffMe, update, colors } = useApp();
  const router = useRouter();
  const [choosing, setChoosing] = useState(false);
  const plan = db.plans.find((x) => x.pupilId === p.id);
  const notes = sharedNotes(db, p.id, 3);
  return (
    <Card style={{ borderLeftWidth: 6, borderLeftColor: colors.lo }}>
      <Row>
        <Avatar pupil={p} size={48} />
        <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>{p.name}</Text>
          <Text style={{ color: colors.ink }}>{'Battery has fallen across ' + drops + ' check-ins: ' + from.toFixed(1) + ' to ' + to.toFixed(1)}</Text>
          <Muted small>{'Attendance ' + p.attendance + '%, no absences flagged yet'}</Muted>
        </View>
        <Sparkline values={values} />
      </Row>
      {notes.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>LATEST NOTES</Text>
          {notes.map((n, i) => (
            <NoteView key={i} item={n} />
          ))}
        </View>
      )}
      {plan && <Banner kind="ok">{'Check-in planned for ' + plan.when.toLowerCase() + ' by ' + plan.by}</Banner>}
      {choosing ? (
        <Row>
          <Text style={{ color: colors.ink }}>When?</Text>
          {['Today', 'Tomorrow', 'This week'].map((w) => (
            <Button
              key={w}
              label={w}
              onPress={() => {
                update((d) => planCheckIn(d, p.id, staffMe!, w));
                setChoosing(false);
              }}
            />
          ))}
          <Button label="Cancel" kind="quiet" onPress={() => setChoosing(false)} />
        </Row>
      ) : (
        <Row>
          <Button label="Plan a check-in" kind="primary" onPress={() => setChoosing(true)} />
          <Button label="Open pupil" onPress={() => router.push({ pathname: '/pupil/[id]', params: { id: p.id } })} />
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
