import { useRouter } from 'expo-router';
import { Button, Checkbox, H1, Muted, Row, Screen } from '@/components/ui';
import { useApp } from '@/state/AppContext';
import type { PupilSettings } from '@/types';

// Settings: the pupil's own choices. Everything starts at the most private sensible default and can be changed any time.
export default function Settings() {
  const { t, me, update, sharedDevice, setSharedDevice, logOut } = useApp();
  const router = useRouter();
  if (!me) return null;
  const set = (patch: Partial<PupilSettings>) =>
    update((d) => {
      const p = d.pupils.find((x) => x.id === me.id)!;
      p.settings = { ...p.settings, ...patch };
    });

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('settings')}</H1>

      <Checkbox
        label={t('showReadReceipts')}
        hint={t('showReadReceiptsHint')}
        checked={me.settings.showReadReceipts}
        onChange={(v) => set({ showReadReceipts: v })}
      />
      {/* PIN on reopen only makes sense on the pupil's own device; shared devices log out anyway. */}
      {!sharedDevice && (
        <Checkbox label={t('pinOnReopen')} hint={t('pinOnReopenHint')} checked={!!me.settings.pinOnReopen} onChange={(v) => set({ pinOnReopen: v })} />
      )}
      <Checkbox label={t('sharedDevice')} hint={t('sharedDeviceHint')} checked={sharedDevice} onChange={setSharedDevice} />

      <Muted small>The walkthrough and your registration choices will be here after Step 8b.</Muted>
      <Row>
        <Button label={t('logout')} onPress={() => logOut()} />
      </Row>
    </Screen>
  );
}
