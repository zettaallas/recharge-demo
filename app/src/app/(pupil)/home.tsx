import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { H1, InfoTip, Screen } from '@/components/ui';
import { Zip } from '@/components/Zip';
import { lastCharge } from '@/domain/checkins';
import { keyAdultName } from '@/domain/posts';
import { useApp } from '@/state/AppContext';

// Pupil home: Zip shows the latest charge, then four big buttons for the four things a pupil does.
// Zip and Settings are in the top bar.
export default function Home() {
  const { t, colors, db, me } = useApp();
  const router = useRouter();
  if (!me) return null;
  // first login: optional personalisation, then the walkthrough (both skippable, both asked only once)
  if (!me.settings.registered) return <Redirect href="/register" />;
  if (!me.settings.walkthroughDone) return <Redirect href="/walkthrough" />;
  const ch = lastCharge(db, me.id);
  const adult = keyAdultName(db, me.id);
  // the badge shows how many replies the pupil has had
  const replies = db.posts.filter((p) => p.pupilId === me.id && p.status === 'followUp').length;

  return (
    <Screen belowBar>
      <View style={styles.hero}>
        <Zip charge={ch} colour={me.buddy.colour} hat={me.buddy.hat} size={90} />
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <H1>{t('hello', { name: me.settings.preferredName || me.name.split(' ')[0] })}</H1>
          <Text style={{ color: colors.ink, fontSize: 18 }}>{ch == null ? t('zipEmpty') : t('zipCharge', { p: Math.round(ch * 100) })}</Text>
          <InfoTip text={t('pupilsOnly')} />
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <BigButton
          icon="heart"
          title={t('shareFeel')}
          sub={t('shareFeelSub')}
          bg={colors.accentSoft}
          accent={colors.accent}
          onPress={() => router.push('/share')}
        />
        <BigButton
          icon="user"
          title={t('profile')}
          sub={t('profileHomeSub')}
          bg={colors.hiBg}
          accent={colors.hi}
          onPress={() => router.push('/profile')}
        />
        <BigButton
          icon="message"
          title={t('talkTeacher')}
          sub={t('talkTeacherSub', { adult })}
          bg={colors.breakSoft}
          accent={colors.break}
          onPress={() => router.push('/talk')}
        />
        <BigButton
          icon="bell"
          title={t('teacherResponse')}
          sub={t('teacherResponseSub', { adult })}
          bg={colors.midBg}
          accent={colors.mid}
          onAccent={colors.zipLine}
          badge={replies ? String(replies) : undefined}
          onPress={() => router.push('/responses')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
});
