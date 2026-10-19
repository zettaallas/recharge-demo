import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { SHARED_DEVICE_TIMEOUT_MS } from '@/data/vocab';
import { translate, type TextKey } from '@/i18n';
import { localStore, loadOrSeed, resetDemo as resetStore } from '@/storage';
import { useColors, type Colors } from '@/theme';
import type { Db, Pupil, Staff } from '@/types';

// App-wide state: the local database, who is logged in, and device settings.
// Mirrors App() in the web prototype.

const SESSION_KEY = 'recharge.session';
const REMEMBER_KEY = 'recharge.rememberClass';
const SHARED_KEY = 'recharge.sharedDevice';

export interface Session {
  kind: 'pupil' | 'staff';
  id: string;
  last: number;
}

interface AppCtx {
  db: Db;
  /** Changes a copy of the database, saves it, and returns fn's result. */
  update: <R>(fn: (d: Db) => R) => R;
  session: Session | null;
  logIn: (pupilId: string) => void;
  logInStaff: (staffId: string) => void;
  logOut: (reason?: 'timeout') => void;
  /** A pupil whose app was reopened with "Ask for my PIN" on. The entry screen sends them to the PIN pad. */
  resumePupilId: string | null;
  cancelResume: () => void;
  /** Set when the last logout was the 20-minute timeout, so the entry screen can say why. */
  timedOut: boolean;
  me: Pupil | null;
  /** The logged-in staff member, on the staff side. */
  staffMe: Staff | null;
  /** Set per device. Only shared devices (e.g. school iPads) get the 20-minute auto-logout. */
  sharedDevice: boolean;
  setSharedDevice: (shared: boolean) => void;
  rememberedClass: string | null;
  setRememberedClass: (classId: string | null) => void;
  t: (key: TextKey, vars?: Record<string, string | number>) => string;
  colors: Colors;
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export function AppProvider({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const colors = useColors();
  const [db, setDb] = useState<Db | null>(null);
  const dbRef = useRef<Db | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [rememberedClass, setRemembered] = useState<string | null>(null);
  const [sharedDevice, setShared] = useState(false);
  const [resumePupilId, setResume] = useState<string | null>(null);
  const lastTouch = useRef(Date.now());

  useEffect(() => {
    (async () => {
      const d = await loadOrSeed();
      const [s, r, sh] = await Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(REMEMBER_KEY), AsyncStorage.getItem(SHARED_KEY)]);
      const shared = sh === '1';
      setShared(shared);
      const saved: Session | null = s ? JSON.parse(s) : null;
      // own device: stay logged in; shared device: only within 20 minutes of the last touch
      const fresh = !shared || (saved != null && Date.now() - saved.last < SHARED_DEVICE_TIMEOUT_MS);
      const pupil = saved?.kind === 'pupil' ? d.pupils.find((p) => p.id === saved.id) : undefined;
      if (saved && fresh && saved.kind === 'staff' && d.staff.some((x) => x.id === saved.id)) setSession(saved);
      if (saved && fresh && pupil) {
        // the pupil chose "Ask for my PIN when I reopen the app"
        if (pupil.settings.pinOnReopen) {
          AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
          setResume(pupil.id);
        } else setSession(saved);
      }
      if (r && d.classes.some((c) => c.id === r)) setRemembered(r);
      dbRef.current = d;
      setDb(d);
    })();
  }, []);

  const update = useCallback(<R,>(fn: (d: Db) => R): R => {
    const next = clone(dbRef.current!);
    const r = fn(next);
    dbRef.current = next;
    setDb(next);
    localStore.save(next).catch(() => {});
    return r;
  }, []);

  const saveSession = (s: Session | null) => {
    setSession(s);
    if (s) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s)).catch(() => {});
    else AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const logIn = useCallback((pupilId: string) => {
    lastTouch.current = Date.now();
    setTimedOut(false);
    setResume(null);
    saveSession({ kind: 'pupil', id: pupilId, last: Date.now() });
  }, []);

  const logInStaff = useCallback((staffId: string) => {
    lastTouch.current = Date.now();
    setTimedOut(false);
    setResume(null);
    saveSession({ kind: 'staff', id: staffId, last: Date.now() });
  }, []);

  const logOut = useCallback((reason?: 'timeout') => {
    setTimedOut(reason === 'timeout');
    saveSession(null);
  }, []);

  // Leaving the app: a shared device logs out so nothing is left on screen for the next person;
  // on an own device, "Ask for my PIN" locks it until the PIN is entered again.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const s = sessionRef.current;
      if (st !== 'background' || !s) return;
      if (sharedDevice) {
        logOut();
        return;
      }
      if (s.kind === 'pupil' && dbRef.current?.pupils.find((p) => p.id === s.id)?.settings.pinOnReopen) {
        // lock now, but keep the saved session so a cold start also lands on the PIN pad
        setSession(null);
        setResume(s.id);
      }
    });
    return () => sub.remove();
  }, [sharedDevice, logOut]);

  // Inactivity timeout, on shared devices only: log out after 20 minutes without a touch,
  // including while the app was in the background.
  useEffect(() => {
    if (!session || !sharedDevice) return;
    const check = () => {
      if (Date.now() - lastTouch.current > SHARED_DEVICE_TIMEOUT_MS) logOut('timeout');
    };
    const iv = setInterval(check, 15000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') check();
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [session?.id, sharedDevice, logOut]);

  const onTouch = () => {
    const now = Date.now();
    lastTouch.current = now;
    // keep the saved session fresh so a reload within 20 minutes stays logged in
    if (session && now - session.last > 30000) saveSession({ ...session, last: now });
  };

  const setRememberedClass = useCallback((id: string | null) => {
    setRemembered(id);
    if (id) AsyncStorage.setItem(REMEMBER_KEY, id).catch(() => {});
    else AsyncStorage.removeItem(REMEMBER_KEY).catch(() => {});
  }, []);

  const setSharedDevice = useCallback((shared: boolean) => {
    lastTouch.current = Date.now();
    setShared(shared);
    AsyncStorage.setItem(SHARED_KEY, shared ? '1' : '0').catch(() => {});
  }, []);

  const resetDemo = useCallback(async () => {
    saveSession(null);
    setRememberedClass(null);
    const d = await resetStore();
    dbRef.current = d;
    setDb(d);
  }, [setRememberedClass]);

  const value = useMemo<AppCtx | null>(() => {
    if (!db) return null;
    return {
      db,
      update,
      session,
      logIn,
      logInStaff,
      logOut,
      resumePupilId,
      cancelResume: () => {
        setResume(null);
        AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      },
      timedOut,
      me: session?.kind === 'pupil' ? db.pupils.find((p) => p.id === session.id) ?? null : null,
      staffMe: session?.kind === 'staff' ? db.staff.find((x) => x.id === session.id) ?? null : null,
      sharedDevice,
      setSharedDevice,
      rememberedClass,
      setRememberedClass,
      t: translate,
      colors,
      resetDemo,
    };
  }, [db, update, session, logIn, logInStaff, logOut, resumePupilId, timedOut, sharedDevice, setSharedDevice, rememberedClass, setRememberedClass, colors, resetDemo]);

  if (!value) return <>{loading}</>;
  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }} onTouchStart={onTouch}>
        {children}
      </View>
    </Ctx.Provider>
  );
}
