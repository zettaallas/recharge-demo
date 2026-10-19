import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { avg, band } from '@/domain/util';
import { useApp } from '@/state/AppContext';
import type { Db } from '@/types';
import { fmtDay } from './StaffUi';

// "Where energy goes": average battery per place and moment, for the last 6 check-in days.
// High drain is outlined as well as coloured, so it doesn't rely on colour alone.
export function Heatmap({ db, classId, pupilIds }: { db: Db; classId: string; pupilIds: Set<string> }) {
  const { colors } = useApp();
  const slots = db.slots[classId] ?? [];
  const cs = db.checkins.filter((c) => pupilIds.has(c.pupilId));
  const dates = Array.from(new Set(cs.map((c) => c.date))).sort().slice(-6);
  const bg = { hi: colors.hiBg, mid: colors.midBg, lo: colors.loBg, none: colors.noneBg };
  const label = { hi: 'Recharges', mid: 'Some drain', lo: 'High drain', none: 'No data' };

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal>
        <View>
          <View style={styles.row}>
            <Text style={[styles.head, styles.first, { color: colors.ink2 }]}>Place · moment</Text>
            {dates.map((d) => (
              <Text key={d} style={[styles.head, styles.cell, { color: colors.ink2 }]}>{fmtDay(d)}</Text>
            ))}
          </View>
          {slots.map((s) => (
            <View key={s.id} style={styles.row}>
              <Text style={[styles.first, { color: colors.ink }]}>
                <Text style={{ fontWeight: '700' }}>{s.name}</Text>
                <Text style={{ color: colors.ink2 }}>{' · ' + s.place}</Text>
              </Text>
              {dates.map((d) => {
                const v = avg(cs.filter((c) => c.date === d && c.ratings[s.id]).map((c) => c.ratings[s.id]));
                const b = band(v);
                return (
                  <View
                    key={d}
                    accessible
                    accessibilityLabel={s.name + ' ' + fmtDay(d) + ': ' + (v == null ? 'no data' : v.toFixed(1) + ', ' + label[b])}
                    style={[styles.cell, styles.box, { backgroundColor: bg[b], borderColor: b === 'lo' ? colors.lo : 'transparent' }]}>
                    <Text style={{ color: colors.ink, fontWeight: '700' }}>{v == null ? '–' : v.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {(['hi', 'mid', 'lo'] as const).map((k) => (
          <View key={k} style={styles.key}>
            <View style={[styles.swatch, { backgroundColor: bg[k], borderColor: k === 'lo' ? colors.lo : 'transparent' }]} />
            <Text style={{ color: colors.ink2, fontSize: 13 }}>{label[k] + (k === 'hi' ? ' (3.5+)' : k === 'mid' ? ' (2.5–3.4)' : ' (under 2.5, outlined)')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  head: { fontSize: 13, fontWeight: '700' },
  first: { width: 220 },
  cell: { width: 82, textAlign: 'center' },
  box: { height: 40, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 18, height: 18, borderRadius: 4, borderWidth: 2 },
});
