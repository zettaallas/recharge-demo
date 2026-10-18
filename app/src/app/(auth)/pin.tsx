import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Banner, Button, H1, Key, Muted, Screen } from '@/components/ui';
import { checkPin } from '@/domain/auth';
import { useApp } from '@/state/AppContext';

// 4-digit PIN on a number pad. 5 wrong tries pause the account until a teacher resets it.
export default function Pin() {
  const { t, colors, db, update, logIn, cancelResume } = useApp();
  const router = useRouter();
  const { pupilId, resume } = useLocalSearchParams<{ pupilId: string; resume?: string }>();
  const pupil = db.pupils.find((p) => p.id === pupilId);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState(pupil?.locked ? t('locked') : '');
  const busy = useRef(false);
  if (!pupil) return <Redirect href="/" />;

  const check = async (p: string) => {
    busy.current = true;
    const copy = { ...pupil };
    const res = await checkPin(copy, p);
    update((d) => {
      const x = d.pupils.find((q) => q.id === pupil.id)!;
      x.failed = copy.failed;
      x.locked = copy.locked;
    });
    busy.current = false;
    setPin('');
    if (res.ok) {
      logIn(pupil.id);
      // clear the login screens so Back can't return to them
      if (router.canDismiss()) router.dismissAll();
      router.replace('/home');
      return;
    }
    setMsg(res.locked ? t('locked') : t('pinWrong', { n: res.triesLeft }));
  };

  const press = (k: string) => {
    if (busy.current) return;
    if (pupil.locked) return setMsg(t('locked'));
    setMsg('');
    const n = (pin + k).slice(0, 4);
    setPin(n);
    if (n.length === 4) check(n);
  };
  const del = () => setPin((p) => p.slice(0, -1));
  // reopened with "Ask for my PIN" on: leaving goes to the entry screen, logged out
  const back = () => {
    if (!resume) return router.back();
    cancelResume();
    router.replace('/');
  };

  return (
    <Screen center>
      <Avatar pupil={pupil} size={80} />
      <H1>{pupil.name}</H1>
      <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>{resume ? t('welcomeBack') : t('enterPin')}</Text>
      <View accessibilityRole="text" accessibilityLabel={pin.length + ' of 4 digits entered'} style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, { borderColor: colors.accent, backgroundColor: i < pin.length ? colors.accent : 'transparent' }]} />
        ))}
      </View>
      {!!msg && <Banner kind={pupil.locked ? 'warn' : 'info'}>{msg}</Banner>}
      <View accessibilityLabel="Number pad" style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <Key key={k} label={k} size={84} onPress={() => press(k)} />
        ))}
        <Key label="⌫" accessibilityLabel="Delete" size={84} onPress={del} />
        <Key label="0" size={84} onPress={() => press('0')} />
        <Key label="←" accessibilityLabel={t('back')} size={84} onPress={back} />
      </View>
      {!!resume && <Button label={t('notYou')} kind="quiet" onPress={back} />}
      <Muted small center>PINs are stored only as scrambled hashes. After 5 wrong tries the account pauses until a teacher resets it.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 16, paddingVertical: 10 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: 84 * 3 + 24, justifyContent: 'center' },
});
