import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Zip } from '@/components/Zip';
import { HATS, ZIP_COLOURS } from '@/data/vocab';
import { useApp } from '@/state/AppContext';
import type { Buddy } from '@/types';

// My Zip: a small, real choice. Colour and hat only; Zip never has a face.
export default function ZipEditor() {
  const { t, colors, me, update } = useApp();
  const router = useRouter();
  if (!me) return null;
  const set = (patch: Partial<Buddy>) =>
    update((d) => {
      const p = d.pupils.find((x) => x.id === me.id)!;
      p.buddy = { ...p.buddy, ...patch };
    });

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('buddy')}</H1>
      <Muted>Zip shows how charged you are. Pick a colour and a hat.</Muted>
      <View style={{ alignItems: 'center' }}>
        <Zip charge={0.75} colour={me.buddy.colour} hat={me.buddy.hat} size={150} />
      </View>

      <Text style={[styles.lbl, { color: colors.ink }]}>{t('colours')}</Text>
      <Row>
        {ZIP_COLOURS.map((c) => {
          const on = me.buddy.colour === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={'Colour ' + c}
              onPress={() => set({ colour: c })}
              style={[styles.swatch, { backgroundColor: colors.zip[c], borderColor: on ? colors.accent : colors.line, borderWidth: on ? 4 : 2 }]}
            />
          );
        })}
      </Row>

      <Text style={[styles.lbl, { color: colors.ink }]}>{t('hats')}</Text>
      <Row>
        {HATS.map((h) => {
          const on = me.buddy.hat === h;
          return (
            <Pressable
              key={h}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={'Hat: ' + h}
              onPress={() => set({ hat: h })}
              style={[styles.hatBtn, { backgroundColor: on ? colors.accentSoft : colors.surface, borderColor: on ? colors.accent : colors.line }]}>
              <Zip charge={0.75} colour={me.buddy.colour} hat={h} size={48} label={'Hat: ' + h} />
            </Pressable>
          );
        })}
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lbl: { fontSize: 17, fontWeight: '700' },
  swatch: { width: 52, height: 52, borderRadius: 26 },
  hatBtn: { width: 76, height: 88, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
