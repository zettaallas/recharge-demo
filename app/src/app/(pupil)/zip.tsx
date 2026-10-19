import { useRouter } from 'expo-router';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { ZipPicker } from '@/components/ZipPicker';
import { useApp } from '@/state/AppContext';
import type { Buddy } from '@/types';

// My Zip: a small, real choice. Colour and hat only; Zip never has a face.
export default function ZipEditor() {
  const { t, me, update } = useApp();
  const router = useRouter();
  if (!me) return null;
  const set = (patch: Partial<Buddy>) =>
    update((d) => {
      const p = d.pupils.find((x) => x.id === me.id)!;
      p.buddy = { ...p.buddy, ...patch };
    });

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('back')} onPress={() => router.back()} />
      </Row>
      <H1>{t('buddy')}</H1>
      <Muted>Zip shows how charged you are. Pick a colour and a hat.</Muted>
      <ZipPicker value={me.buddy} onChange={set} />
    </Screen>
  );
}
