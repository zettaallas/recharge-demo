import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/state/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider
        loading={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator accessibilityLabel="Loading Recharge" />
          </View>
        }>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
