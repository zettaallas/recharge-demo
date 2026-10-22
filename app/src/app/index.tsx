import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { DEMO } from '@/data/seed';
import { useApp } from '@/state/AppContext';

// Entry: choose who you are. Same choices as the web prototype.
export default function Entry() {
  const { t, colors, session, timedOut, rememberedClass, resetDemo, resumePupilId, mode } = useApp();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);

  if (session) return <Redirect href={session.kind === 'staff' ? '/overview' : '/home'} />;
  if (resumePupilId) return <Redirect href={{ pathname: '/pin', params: { pupilId: resumePupilId, resume: '1' } }} />;

  const pupil = () =>
    rememberedClass
      ? router.push({ pathname: '/pick-name', params: mode === 'supabase' ? { code: rememberedClass } : { classId: rememberedClass } })
      : router.push('/class-code');

  const Tile = ({ title, sub, onPress, soon }: { title: string; sub: string; onPress?: () => void; soon?: boolean }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: soon }}
      disabled={soon}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: pressed ? colors.accent : colors.line, opacity: soon ? 0.55 : 1 },
      ]}>
      <Text style={[styles.tileTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={{ color: colors.ink2 }}>{soon ? 'Coming later in this version' : sub}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Text style={[styles.brand, { color: colors.accent }]}>Recharge</Text>
      <H1>{t('who')}</H1>
      <Muted>{t('tagline')}</Muted>
      {timedOut && <Banner kind="info">{t('timeout')}</Banner>}

      <View style={{ gap: 12 }}>
        <Tile title={t('iAmPupil')} sub={t('enterCode')} onPress={pupil} />
        <Tile title={t('iAmStaff')} sub="Email and password" onPress={() => router.push('/staff-login')} />
        <Tile title={t('familyNote')} sub="For parents and carers, with your child's PIN" soon />
      </View>

      <View style={[styles.demo, { backgroundColor: colors.surface2 }]}>
        <Text style={[styles.eyebrow, { color: colors.ink2 }]}>DEMO · FICTIONAL DATA ONLY</Text>
        <Text style={{ color: colors.ink }}>
          Pupils: class code {DEMO.classCode}, any name, PIN {DEMO.pupilPin}. Isla M. shows a falling battery with normal attendance. Noor H. is new, to try first login.
        </Text>
        <Text style={{ color: colors.ink }}>
          {mode === 'supabase'
            ? 'Staff: demo@recharge.test (class teacher), keyadult@, senco@ and dsl@recharge.test, with the passwords shown when the demo was set up.'
            : 'Staff: demo@recharge.test (class teacher), keyadult@, senco@ and dsl@recharge.test, password ' + DEMO.staffPassword + '.'}
        </Text>
        <Muted small>
          {mode === 'supabase'
            ? 'Shared school database: the phone and the laptop see the same (fictional) data. PINs are checked on the server.'
            : 'Everything is saved only on this device. PINs are stored hashed.'}
        </Muted>
        {/* the shared database is never reset from the app */}
        {mode === 'supabase' ? null : confirmReset ? (
          <Row>
            <Text style={{ color: colors.ink }}>Clear all changes and reload the demo data?</Text>
            <Button label="Yes, reset" kind="danger" onPress={() => { setConfirmReset(false); resetDemo(); }} />
            <Button label="Cancel" onPress={() => setConfirmReset(false)} />
          </Row>
        ) : (
          <Row>
            <Button label="Reset demo" onPress={() => setConfirmReset(true)} />
          </Row>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 22, fontWeight: '700' },
  tile: { minHeight: 96, borderRadius: 20, borderWidth: 1, padding: 18, gap: 6, justifyContent: 'center' },
  tileTitle: { fontSize: 20, fontWeight: '700' },
  demo: { borderRadius: 20, padding: 16, gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
