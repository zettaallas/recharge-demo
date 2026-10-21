import { Redirect, Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Button } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// Pupil screens need a logged-in pupil. Logging out (or the 20-minute timeout) sends them back to the entry screen.
// The top bar is on every pupil screen: home, My Zip and Settings (and Hide on shared devices).
export default function PupilLayout() {
  const { me, t, colors, sharedDevice, logOut } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  if (!me) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.bar, { paddingTop: insets.top + 8, borderColor: colors.line, backgroundColor: colors.bg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home')} onPress={() => router.navigate('/home')} style={{ marginRight: 'auto' }}>
          <Text style={[styles.brand, { color: colors.accent }]}>Recharge</Text>
        </Pressable>
        <IconBtn icon="star" label={t('myZip')} onPress={() => router.navigate('/zip')} />
        <IconBtn icon="sliders" label={t('settings')} onPress={() => router.navigate('/settings')} />
        {/* Shared devices: one tap clears the screen and logs out, so nobody else sees the page. */}
        {sharedDevice && <Button label={t('hide')} onPress={() => logOut()} accessibilityLabel={t('hide') + ' and log out'} />}
      </View>
      <Stack screenOptions={{ headerShown: false }} />
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
});
