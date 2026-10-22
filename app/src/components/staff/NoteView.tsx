import { Image, StyleSheet, Text, View } from 'react-native';
import { PictoChips } from '@/components/Pictos';
import { pictoIcon } from '@/data/vocab';
import type { NoteEntry } from '@/domain/checkins';
import { useApp } from '@/state/AppContext';
import { fmtDay } from './StaffUi';

// One check-in note, shown to staff exactly as the pupil made it. Photos are never interpreted.
export function NoteView({ item, pupilName }: { item: NoteEntry; pupilName?: string }) {
  const { t, colors } = useApp();
  const n = item.n;
  const help = [...n.help.chips, ...(n.help.text ? [n.help.text] : [])];
  return (
    <View style={[styles.note, { backgroundColor: colors.surface2 }]}>
      <Text style={{ color: colors.ink2, fontSize: 13 }}>
        {(pupilName ? pupilName + ' · ' : '') + fmtDay(item.date) + ' · ' + item.label + (item.rating ? ' · battery ' + item.rating + '/5' : '')}
      </Text>
      {!!n.text && <Text style={{ color: colors.ink, fontSize: 16 }}>{'"' + n.text + '"'}</Text>}
      <PictoChips items={n.symbols.map((s) => ({ key: s, icon: pictoIcon(s), label: t(s) }))} />
      {help.length > 0 && (
        <Text style={{ color: colors.ink }}>
          <Text style={{ fontWeight: '700' }}>What would help: </Text>
          {help.join(' · ')}
        </Text>
      )}
      {!!n.photo && (
        <>
          <Image source={{ uri: n.photo }} accessibilityLabel="Photo the pupil added" style={styles.photo} />
          <Text style={{ color: colors.ink2, fontSize: 13 }}>Images are not analysed. Ask the pupil what it shows.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: 14, padding: 12, gap: 6 },
  photo: { width: 160, height: 120, borderRadius: 10 },
});
