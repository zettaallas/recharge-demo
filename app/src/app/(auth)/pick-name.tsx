import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Checkbox, H1, Muted, Row, Screen } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// Tap your name. Names show for the chosen class only.
export default function PickName() {
  const { t, colors, db, rememberedClass, setRememberedClass, sharedDevice, setSharedDevice } = useApp();
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) return <Redirect href="/class-code" />;

  const pupils = db.pupils.filter((p) => p.classId === cls.id).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen>
      <H1>{t('tapName')}</H1>
      <Row>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{cls.name}</Text>
        <Button
          label={t('changeClass')}
          onPress={() => {
            setRememberedClass(null);
            router.replace('/class-code');
          }}
        />
      </Row>
      {rememberedClass === cls.id && <Muted>{t('remembered', { c: cls.name })}</Muted>}
      <View style={styles.grid}>
        {pupils.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.name + (p.locked ? ', paused' : '')}
            onPress={() => router.push({ pathname: '/pin', params: { pupilId: p.id } })}
            style={({ pressed }) => [styles.tile, { backgroundColor: colors.surface, borderColor: pressed ? colors.accent : colors.line }]}>
            <Avatar pupil={p} size={56} />
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{p.name}</Text>
            {p.locked && <Text style={{ color: colors.warnInk, fontSize: 13 }}>Paused</Text>}
          </Pressable>
        ))}
      </View>
      {/* Asked once per device; most secondary pupils use their own phone, so it starts off. */}
      <Checkbox label={t('sharedDevice')} hint={t('sharedDeviceHint')} checked={sharedDevice} onChange={setSharedDevice} />
      <Row>
        <Button label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: 150, minHeight: 132, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, flexGrow: 1 },
});
