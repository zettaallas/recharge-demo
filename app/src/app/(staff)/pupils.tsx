import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '@/components/Sparkline';
import { Card, MiniBattery, Pill } from '@/components/staff/StaffUi';
import { Avatar, H1, Muted, Screen } from '@/components/ui';
import { Access } from '@/domain/access';
import { pupilSeries } from '@/domain/checkins';
import { driftInfo } from '@/domain/drift';
import { useApp } from '@/state/AppContext';

// Pupils: the key adult sees the pupils they support; the SENCO sees everyone. Tap a row to open the pupil.
export default function Pupils() {
  const { db, staffMe, colors } = useApp();
  const router = useRouter();
  if (!staffMe) return null;
  const pupils = (staffMe.role === 'senco' ? db.pupils : db.pupils.filter((p) => p.keyAdultId === staffMe.id)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Screen wide belowBar>
      <H1>Pupils</H1>
      <Muted>{staffMe.role === 'senco' ? 'Everyone in the school.' : 'The pupils you are key adult for.'}</Muted>
      <Card style={{ gap: 0, padding: 0 }}>
        {pupils.map((p, i) => {
          const s = pupilSeries(db, p.id);
          const last = s.length ? s[s.length - 1].avg : null;
          const drift = Access.canSeeDrift(staffMe, p) && driftInfo(s.map((x) => x.avg));
          const prof = Access.profile(db, p);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={'Open ' + p.name}
              onPress={() => router.push({ pathname: '/pupil/[id]', params: { id: p.id } })}
              style={({ pressed }) => [styles.row, { borderTopWidth: i ? 1 : 0, borderColor: colors.line, backgroundColor: pressed ? colors.accentSoft : 'transparent' }]}>
              <View style={[styles.cell, { flexBasis: 220, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <Avatar pupil={p} size={36} />
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{p.name}</Text>
                {!!drift && <Pill text="Drift" kind="lo" />}
              </View>
              <View style={[styles.cell, { flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <MiniBattery value={last} label={p.name + ' latest battery'} />
                <Text style={{ color: colors.ink }}>{last == null ? '–' : last.toFixed(1)}</Text>
              </View>
              <View style={[styles.cell, { flexBasis: 110 }]}>
                <Sparkline values={s.map((x) => x.avg)} w={100} h={30} />
              </View>
              <Text style={[styles.cell, { flexBasis: 110, color: colors.ink }]}>{'Attendance ' + p.attendance + '%'}</Text>
              <View style={[styles.cell, { flexBasis: 120 }]}>{prof ? <Pill text="Profile approved" kind="hi" /> : <Pill text="Profile not shared" />}</View>
              <Text style={[styles.cell, { flexBasis: 140, color: colors.ink2 }]}>{'Key adult: ' + (db.staff.find((x) => x.id === p.keyAdultId)?.name ?? '')}</Text>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  cell: { flexGrow: 1 },
});
