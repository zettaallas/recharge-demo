import { StyleSheet, Text, View } from 'react-native';
import { Card, H2, Pill } from '@/components/staff/StaffUi';
import { useStaffClass } from '@/components/staff/StaffClass';
import { H1, Muted, Screen } from '@/components/ui';
import { Access } from '@/domain/access';
import { classHelpAnswers } from '@/components/staff/classData';
import { groupThemes } from '@/domain/themes';
import { useApp } from '@/state/AppContext';

// Most asked for: pupils' answers to "What would help?", grouped into themes by keyword.
// Anonymous: quotes are shown without names. Notes a pupil kept private are left out. AI grouping stays off for now.
export default function Themes() {
  const { db, staffMe, colors, mode, summaries } = useApp();
  const { classId } = useStaffClass();
  if (!staffMe || !classId) return null;
  if (!Access.canSeeThemes(staffMe))
    return (
      <Screen wide belowBar>
        <H1>Most asked for</H1>
        <Muted>Not part of your role.</Muted>
      </Screen>
    );
  const pupils = Access.visiblePupils(db, staffMe, classId);
  const answers = classHelpAnswers(mode, db, new Set(pupils.map((p) => p.id)), summaries[classId]);
  const groups = groupThemes(answers);
  const max = Math.max(1, ...groups.map((g) => g.answers.length));

  return (
    <Screen wide belowBar>
      <H1>Most asked for</H1>
      <Card>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
            <H2>What would help?</H2>
            <Muted small>{answers.length + ' answers' + (mode === 'local' ? ' from ' + new Set(answers.map((a) => a.pupilId)).size + ' pupils' : '') + ', grouped by keywords. No names are shown.'}</Muted>
          </View>
          <Pill text="AI off · keyword grouping" />
        </View>
        {groups.length === 0 && <Muted>No answers yet.</Muted>}
        {groups.map((g) => (
          <View key={g.id} style={{ gap: 6 }}>
            <View style={styles.head}>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16, flex: 1 }}>{g.label}</Text>
              <Text style={{ color: colors.ink2 }}>{g.answers.length + ' answers' + (mode === 'local' ? ' · ' + g.pupils + ' pupils' : '')}</Text>
            </View>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.track, { backgroundColor: colors.surface2 }]}>
              <View style={[styles.bar, { width: `${(g.answers.length / max) * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text style={{ color: colors.ink2 }}>{g.answers.slice(0, 4).map((a) => '"' + a.text + '"').join('   ·   ')}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  bar: { height: 12, borderRadius: 6 },
});
