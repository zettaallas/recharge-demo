import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Banner, Button, Checkbox, H1, Muted, Row, Screen } from '@/components/ui';
import { DEMO } from '@/data/seed';
import { findClass } from '@/domain/auth';
import { useApp } from '@/state/AppContext';

// Class code in an ordinary text box. Case, spaces and the hyphen don't matter.
export default function ClassCode() {
  const { t, colors, db, setRememberedClass, mode, loadRoster } = useApp();
  const router = useRouter();
  const [val, setVal] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (v = val) => {
    if (mode === 'supabase') {
      // the class list comes from the server; an unknown code just finds nothing
      const ro = await loadRoster(v);
      if (!ro) return setErr(t('codeWrong'));
      if (remember) setRememberedClass(ro.code);
      return router.replace({ pathname: '/pick-name', params: { code: ro.code } });
    }
    const c = findClass(db, v);
    if (!c) return setErr(t('codeWrong'));
    if (remember) setRememberedClass(c.id);
    router.replace({ pathname: '/pick-name', params: { classId: c.id } });
  };

  return (
    <Screen>
      <H1>{t('enterCode')}</H1>
      <Muted>{t('codeHint')}</Muted>
      <TextInput
        value={val}
        onChangeText={(v) => {
          setErr('');
          setVal(v.toUpperCase());
        }}
        onSubmitEditing={() => submit()}
        accessibilityLabel={t('enterCode')}
        placeholder={DEMO.classCode}
        placeholderTextColor={colors.ink2}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={8}
        returnKeyType="go"
        autoFocus
        style={[styles.input, { color: colors.ink, borderColor: err ? colors.lo : colors.accent, backgroundColor: colors.surface }]}
      />
      {!!err && <Banner kind="warn">{err}</Banner>}
      <Checkbox label={t('remember')} checked={remember} onChange={setRemember} />
      <Row>
        <Button label={t('back')} onPress={() => router.back()} />
        <Button label={t('next')} kind="primary" large disabled={!val.trim()} onPress={() => submit()} />
        <Button
          label={t('useDemo')}
          kind="quiet"
          onPress={() => {
            setVal(DEMO.classCode);
            submit(DEMO.classCode);
          }}
        />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 32, fontWeight: '700', letterSpacing: 4, borderWidth: 2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64, maxWidth: 320 },
});
