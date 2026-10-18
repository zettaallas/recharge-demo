import { Redirect, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// Pupil screens need a logged-in pupil. Logging out (or the 20-minute timeout) sends them back to the entry screen.
export default function PupilLayout() {
  const { me, t, colors, sharedDevice, logOut } = useApp();
  const insets = useSafeAreaInsets();
  if (!me) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.bar, { paddingTop: insets.top + 8, borderColor: colors.line, backgroundColor: colors.bg }]}>
        <Text style={[styles.brand, { color: colors.accent }]}>Recharge</Text>
        {/* Shared devices: one tap clears the screen and logs out, so nobody else sees the page. */}
        {sharedDevice && <Button label={t('hide')} onPress={() => logOut()} accessibilityLabel={t('hide') + ' and log out'} />}
      </View>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1 },
  brand: { fontSize: 20, fontWeight: '700', marginRight: 'auto' },
});
