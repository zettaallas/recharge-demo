import { useRouter } from 'expo-router';
import { FeedList } from '@/components/FeedList';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// You said, we did on its own screen. The same list is the second tab of "See my teacher's response".
export default function Feed() {
  const { t } = useApp();
  const router = useRouter();
  return (
    <Screen belowBar>
      <Row>
        <Button label={t('back')} onPress={() => router.back()} />
      </Row>
      <H1>{t('feed')}</H1>
      <Muted>{t('feedSub')}</Muted>
      <FeedList />
    </Screen>
  );
}
