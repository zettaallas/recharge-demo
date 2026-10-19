import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Checkbox, H1, Muted, Row, Screen } from '@/components/ui';
import { ZipPicker } from '@/components/ZipPicker';
import { HELP_CHIPS } from '@/data/vocab';
import { syncProfile } from '@/domain/profile';
import { useApp } from '@/state/AppContext';
import type { Buddy } from '@/types';

// Make Recharge yours: shown once after a pupil's first login, and any time from Settings.
// Every field is optional; "Skip for now" saves nothing but still counts as done, so it isn't asked again.
export default function Register() {
  const { t, colors, me, update, sharedDevice, setSharedDevice } = useApp();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [name, setName] = useState(me?.settings.preferredName ?? '');
  const [buddy, setBuddy] = useState<Buddy>(me?.buddy ?? { colour: 'teal', hat: 'none' });
  const [helps, setHelps] = useState<string[]>(me?.settings.helps ?? []);
  if (!me) return null;
  const first = me.name.split(' ')[0];

  // first time: on to the walkthrough (unless already seen); from Settings: back where they came from
  const next = () => {
    if (edit) router.back();
    else if (!me.settings.walkthroughDone) router.replace('/walkthrough');
    else router.replace('/home');
  };

  const save = () => {
    update((d) => {
      const p = d.pupils.find((x) => x.id === me.id)!;
      p.buddy = buddy;
      p.settings = { ...p.settings, preferredName: name.trim() || undefined, helps, registered: true };
      syncProfile(d, me.id);
    });
    next();
  };

  const skip = () => {
    update((d) => {
      d.pupils.find((x) => x.id === me.id)!.settings.registered = true;
    });
    next();
  };

  const toggle = (c: string) => setHelps((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));

  return (
    <Screen belowBar>
      <H1>{t('regTitle')}</H1>
      <Muted>{t('regIntro')}</Muted>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.lbl, { color: colors.ink }]}>{t('regName')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('regNameHint', { name: first })}
          placeholderTextColor={colors.ink2}
          accessibilityLabel={t('regName')}
          maxLength={30}
          style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }]}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.lbl, { color: colors.ink }]}>{t('regZip')}</Text>
        <ZipPicker value={buddy} onChange={(patch) => setBuddy((b) => ({ ...b, ...patch }))} size={110} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.lbl, { color: colors.ink }]}>{t('regHelps')}</Text>
        <Muted small>{t('regHelpsHint')}</Muted>
        <View style={styles.chips}>
          {HELP_CHIPS.map((c) => {
            const on = helps.includes(c);
            return (
              <Pressable
                key={c}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(c)}
                style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surface2 }]}>
                <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{(on ? '✓ ' : '') + c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* the device setting applies straight away, like the one on the name screen */}
      <Checkbox label={t('sharedDevice')} hint={t('sharedDeviceHint')} checked={sharedDevice} onChange={setSharedDevice} />

      <Row>
        <Button label={t('regSave')} kind="primary" large onPress={save} />
        <Button label={t('regSkip')} kind="quiet" onPress={skip} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  lbl: { fontSize: 17, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
});
