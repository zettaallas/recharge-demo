import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { Button, H1, Row, Screen } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// Share how I feel: the pupil picks the way that suits them today.
export default function Share() {
  const { t, colors } = useApp();
  const router = useRouter();
  return (
    <Screen belowBar>
      <Row>
        <Button icon="home" label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('shareHow')}</H1>
      <View style={{ gap: 14 }}>
        <BigButton icon="battery" title={t('checkIn')} sub={t('checkInSub')} bg={colors.accentSoft} accent={colors.accent} onPress={() => router.push('/check-in')} />
        <BigButton icon="grid" title={t('symbols')} sub={t('symbolsSub')} bg={colors.hiBg} accent={colors.hi} onPress={() => router.push('/symbols')} />
        <BigButton icon="camera" title={t('walk')} sub={t('walkSub')} bg={colors.midBg} accent={colors.mid} onAccent={colors.zipLine} onPress={() => router.push('/walk')} />
      </View>
    </Screen>
  );
}
