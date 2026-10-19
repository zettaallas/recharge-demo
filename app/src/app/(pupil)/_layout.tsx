import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Button } from '@/components/ui';
import { Zip } from '@/components/Zip';
import { keyAdultName, logBreak } from '@/domain/posts';
import { useApp } from '@/state/AppContext';

// Pupil screens need a logged-in pupil. Logging out (or the 20-minute timeout) sends them back to the entry screen.
// The top bar is on every pupil screen: "I need a break" is always one tap away.
export default function PupilLayout() {
  const { me, t, colors, db, update, sharedDevice, logOut } = useApp();
  const insets = useSafeAreaInsets();
  const [breakOpen, setBreakOpen] = useState(false);
  const router = useRouter();
  if (!me) return <Redirect href="/" />;

  const needBreak = () => {
    update((d) => logBreak(d, me.id, t('needBreak')));
    setBreakOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.bar, { paddingTop: insets.top + 8, borderColor: colors.line, backgroundColor: colors.bg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home')} onPress={() => router.navigate('/home')} style={{ marginRight: 'auto' }}>
          <Text style={[styles.brand, { color: colors.accent }]}>Recharge</Text>
        </Pressable>
        <IconBtn icon="star" label={t('myZip')} onPress={() => router.navigate('/zip')} />
        <IconBtn icon="sliders" label={t('settings')} onPress={() => router.navigate('/settings')} />
        <Button label={t('needBreak')} kind="break" onPress={needBreak} />
        {/* Shared devices: one tap clears the screen and logs out, so nobody else sees the page. */}
        {sharedDevice && <Button label={t('hide')} onPress={() => logOut()} accessibilityLabel={t('hide') + ' and log out'} />}
      </View>
      <Stack screenOptions={{ headerShown: false }} />

      <Modal visible={breakOpen} transparent animationType="fade" onRequestClose={() => setBreakOpen(false)}>
        <View style={styles.overlay}>
          <View accessibilityViewIsModal accessibilityLabel={t('needBreak')} style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <View style={styles.stage}>
              <Zip charge={0.2} colour={me.buddy.colour} hat={me.buddy.hat} size={90} />
              <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                <Text accessibilityRole="header" style={[styles.h2, { color: colors.ink }]}>{t('needBreak')}</Text>
                <Text style={{ color: colors.ink, fontSize: 18 }}>{t('breakSent', { adult: keyAdultName(db, me.id) })}</Text>
              </View>
            </View>
            <Button label={t('ok')} kind="primary" large onPress={() => setBreakOpen(false)} />
            {/* outlined, not filled, so it doesn't look like a second OK */}
            <Button
              label={t('seeSent')}
              onPress={() => {
                setBreakOpen(false);
                router.navigate({ pathname: '/responses', params: { tab: 'sent', at: String(Date.now()) } });
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** A small square icon button for the top bar, with a spoken label. */
function IconBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.accentSoft : colors.surface }]}>
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, flexWrap: 'wrap' },
  brand: { fontSize: 20, fontWeight: '700' },
  iconBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 520, borderRadius: 20, padding: 20, gap: 18 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  h2: { fontSize: 24, fontWeight: '700' },
});
