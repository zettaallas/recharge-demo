import { Redirect, Stack, usePathname, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classesFor, StaffClassCtx } from '@/components/staff/StaffClass';
import { Button } from '@/components/ui';
import { ROLE_LABEL } from '@/data/vocab';
import { Access, inboxFor } from '@/domain/access';
import { useApp } from '@/state/AppContext';
import type { Db, Staff } from '@/types';

// Staff screens need a staff login. The top bar shows who is logged in, the sections their role can use, and Log out.
type NavItem = { href: Href; path: string; label: string; show: (s: Staff, db: Db) => boolean };
const NAV: NavItem[] = [
  { href: '/overview', path: '/overview', label: 'Overview', show: () => true },
  { href: '/requests', path: '/requests', label: 'Requests', show: (s, db) => Access.hasKeyPupils(db, s) },
  { href: '/pupils', path: '/pupils', label: 'Pupils', show: (s, db) => s.role === 'senco' || Access.hasKeyPupils(db, s) },
  { href: '/themes', path: '/themes', label: 'Most asked for', show: (s) => Access.canSeeThemes(s) },
  { href: '/yswd', path: '/yswd', label: 'You said, we did', show: (s) => Access.canManage(s) },
  { href: '/safeguarding', path: '/safeguarding', label: 'Safeguarding', show: () => true },
  { href: '/class', path: '/class', label: 'Class & PINs', show: (s) => Access.canManage(s) },
  { href: '/quick-replies', path: '/quick-replies', label: 'My quick replies', show: (s, db) => Access.hasKeyPupils(db, s) },
];

export default function StaffLayout() {
  const { staffMe, colors, db, logOut } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const [picked, setClassId] = useState<string | null>(null);
  if (!staffMe) return <Redirect href="/" />;
  const unread = inboxFor(db, staffMe).filter((p) => p.status === 'sent').length;
  const openFlags = Access.canSeeSafeguarding(staffMe) ? db.flags.filter((f) => f.status === 'open').length : 0;
  const classes = classesFor(db, staffMe);
  const classId = classes.some((c) => c.id === picked) ? picked : (classes[0]?.id ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.bar, { paddingTop: insets.top + 8, borderColor: colors.line }]}>
        <View style={{ marginRight: 'auto' }}>
          <Text style={[styles.brand, { color: colors.accent }]}>Recharge · Staff</Text>
          <Text style={{ color: colors.ink2, fontSize: 13 }}>{staffMe.name + ' · ' + ROLE_LABEL[staffMe.role]}</Text>
        </View>
        <Button label="Log out" onPress={() => logOut()} />
      </View>
      <View accessibilityRole="tablist" style={[styles.nav, { borderColor: colors.line }]}>
        {NAV.filter((n) => n.show(staffMe, db)).map((n) => {
          const on = path === n.path || (n.path === '/pupils' && path.startsWith('/pupil/'));
          const badge =
            n.path === '/requests' && unread ? ' (' + unread + ')' : n.path === '/safeguarding' && openFlags ? ' (' + openFlags + ' open)' : '';
          return (
            <Pressable
              key={n.path}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(n.href)}
              style={[styles.tab, { backgroundColor: on ? colors.accent : colors.surface, borderColor: on ? colors.accent : colors.line }]}>
              <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{n.label + badge}</Text>
            </Pressable>
          );
        })}
        {/* class picker, when this person can see more than one class */}
        {classes.length > 1 && !Access.canSeeSafeguarding(staffMe) && (
          <View style={styles.classes}>
            {classes.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: c.id === classId }}
                accessibilityLabel={'Class ' + c.name}
                onPress={() => setClassId(c.id)}
                style={[styles.classBtn, { borderColor: c.id === classId ? colors.accent : colors.line, backgroundColor: c.id === classId ? colors.accentSoft : colors.surface }]}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <StaffClassCtx.Provider value={{ classId, setClassId }}>
        <Stack screenOptions={{ headerShown: false }} />
      </StaffClassCtx.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, flexWrap: 'wrap' },
  brand: { fontSize: 20, fontWeight: '700' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  classes: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  classBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, justifyContent: 'center' },
  tab: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
});
