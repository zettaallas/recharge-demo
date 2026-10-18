import { Button, Checkbox, H1, Muted, Row, Screen } from '@/components/ui';
import { useApp } from '@/state/AppContext';

// Placeholder pupil home. Step 5 adds Zip, the tiles and the battery check-in.
export default function Home() {
  const { t, me, update, sharedDevice, logOut } = useApp();
  if (!me) return null;
  const setPinOnReopen = (v: boolean) =>
    update((d) => {
      d.pupils.find((p) => p.id === me.id)!.settings.pinOnReopen = v;
    });
  return (
    <Screen belowBar>
      <H1>{t('hello', { name: me.settings.preferredName || me.name.split(' ')[0] })}</H1>
      <Muted>{t('pupilsOnly')}</Muted>
      <Muted small>The pupil screens arrive in the next steps.</Muted>
      {/* Own device only: the pupil chooses whether to lock the app with their PIN. Moves to Settings in Step 8. */}
      {!sharedDevice && (
        <Checkbox label={t('pinOnReopen')} hint={t('pinOnReopenHint')} checked={!!me.settings.pinOnReopen} onChange={setPinOnReopen} />
      )}
      <Row>
        <Button label={t('logout')} onPress={() => logOut()} />
      </Row>
    </Screen>
  );
}
