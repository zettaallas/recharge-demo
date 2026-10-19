import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, H2, Pill } from '@/components/staff/StaffUi';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { DEMO } from '@/data/seed';
import { ROLE_LABEL } from '@/data/vocab';
import { checkStaffLogin } from '@/domain/staff';
import { useApp } from '@/state/AppContext';

// Staff log in: email and password. The four demo accounts each show a different role's view.
export default function StaffLogin() {
  const { colors, db, logInStaff } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async (em = email, p = pw) => {
    setBusy(true);
    const s = await checkStaffLogin(db, em, p);
    setBusy(false);
    if (!s) return setErr('That email and password do not match. Check them and try again.');
    logInStaff(s.id);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/overview');
  };

  const input = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }];

  return (
    <Screen wide>
      <View style={styles.cols}>
        <Card style={styles.col}>
          <H1>Staff log in</H1>
          <Text style={[styles.lbl, { color: colors.ink }]}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="username" accessibilityLabel="Email" style={input} />
          <Text style={[styles.lbl, { color: colors.ink }]}>Password</Text>
          <TextInput value={pw} onChangeText={setPw} secureTextEntry autoComplete="current-password" accessibilityLabel="Password" onSubmitEditing={() => login()} style={input} />
          {!!err && <Banner kind="warn">{err}</Banner>}
          <Row>
            <Button label="Back" onPress={() => router.back()} />
            <Button label="Log in" kind="primary" disabled={busy || !email || !pw} onPress={() => login()} />
          </Row>
        </Card>
        <Card style={styles.col}>
          <H2>Demo accounts</H2>
          <Muted small>{'Each role sees different things. Password for all: ' + DEMO.staffPassword + '. All data is fictional.'}</Muted>
          {db.staff.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={'Log in as ' + s.name + ', ' + ROLE_LABEL[s.role]}
              disabled={busy}
              onPress={() => login(s.email, DEMO.staffPassword)}
              style={({ pressed }) => [styles.demo, { borderColor: pressed ? colors.accent : colors.line, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{s.name}</Text>
              <Pill text={ROLE_LABEL[s.role]} />
            </Pressable>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { flexGrow: 1, flexBasis: 300 },
  lbl: { fontSize: 15, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
});
