import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HATS, ZIP_COLOURS } from '@/data/vocab';
import { useApp } from '@/state/AppContext';
import type { Buddy } from '@/types';
import { Row } from './ui';
import { Zip } from './Zip';

// Zip's colour and hat. Used in My Zip and when a pupil first personalises Recharge.
export function ZipPicker({ value, onChange, size = 150 }: { value: Buddy; onChange: (patch: Partial<Buddy>) => void; size?: number }) {
  const { t, colors } = useApp();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <Zip charge={0.75} colour={value.colour} hat={value.hat} size={size} />
      </View>

      <Text style={[styles.lbl, { color: colors.ink }]}>{t('colours')}</Text>
      <Row>
        {ZIP_COLOURS.map((c) => {
          const on = value.colour === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={'Colour ' + c}
              onPress={() => onChange({ colour: c })}
              style={[styles.swatch, { backgroundColor: colors.zip[c], borderColor: on ? colors.accent : colors.line, borderWidth: on ? 4 : 2 }]}
            />
          );
        })}
      </Row>

      <Text style={[styles.lbl, { color: colors.ink }]}>{t('hats')}</Text>
      <Row>
        {HATS.map((h) => {
          const on = value.hat === h;
          return (
            <Pressable
              key={h}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={'Hat: ' + h}
              onPress={() => onChange({ hat: h })}
              style={[styles.hatBtn, { backgroundColor: on ? colors.accentSoft : colors.surface, borderColor: on ? colors.accent : colors.line }]}>
              <Zip charge={0.75} colour={value.colour} hat={h} size={48} label={'Hat: ' + h} />
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: { fontSize: 17, fontWeight: '700' },
  swatch: { width: 52, height: 52, borderRadius: 26 },
  hatBtn: { width: 76, height: 88, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
