import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { SHARED_DEVICE_TIMEOUT_MS } from '@/data/vocab';
import { translate, type TextKey } from '@/i18n';
import { classRoster, pupilLogin, supabase, supabaseConfigured, type PupilLoginResult } from '@/lib/supabase';
import { localStore, loadOrSeed, resetDemo as resetStore } from '@/storage';
import { applyWrites, loadClassSummaries, loadRemoteDb, SaveError, type ClassSummary } from '@/storage/remote';
import { emptyDb } from '@/storage/supabaseMap';
import { applyMedia, diffDb, pickMedia, type Actor, type MediaMap } from '@/storage/writes';
import { useColors, type Colors } from '@/theme';
import type { AvatarColour, Db, Pupil, Staff } from '@/types';

// App-wide state: the data, who is logged in, and device settings.
//
// Two modes:
//   'local'    - the original demo: all data lives on this device (used when Supabase isn't configured).
//   'supabase' - the shared school database. The phone and the laptop see the same data. What each person can
//                read is decided on the server by the access rules; the app only ever uses the normal (anon) key.

const SESSION_KEY = 'recharge.session';
const REMEMBER_KEY = 'recharge.rememberClass'; // local mode: class id; Supabase mode: class code
const SHARED_KEY = 'recharge.sharedDevice';
const LAST_CODE_KEY = 'recharge.lastClassCode'; // for "Ask for my PIN" in Supabase mode
const MEDIA_KEY = 'recharge.media.'; // + pupil id: photos, drawings and voice notes kept on this device (Supabase mode)

export type DataMode = 'local' | 'supabase';
export const DATA_MODE: DataMode = supabaseConfigured ? 'supabase' : 'local';

export interface Session {
  kind: 'pupil' | 'staff';
  id: string;
  last: number;
}

export interface Roster {
  code: string;
  classId: string;
  className: string;
  pupils: { id: string; name: string; avatar: AvatarColour; locked: boolean }[];
}

export type SaveResult<R> = { ok: true; value: R } | { ok: false; message: string };

interface AppCtx {
  mode: DataMode;
  db: Db;
  /** Changes a copy of the data and keeps it (in Supabase mode, saves it in the background). */
  update: <R>(fn: (d: Db) => R) => R;
  /** Like update, but waits for the save. Use it where the pupil or teacher typed something:
   *  on failure, keep their words on screen and don't move on. */
  save: <R>(fn: (d: Db) => R) => Promise<SaveResult<R>>;
  /** Supabase mode: the last save that didn't go through, in friendly words. */
  saveError: string | null;
  clearSaveError: () => void;
  session: Session | null;
  /** Local mode only: mark a pupil or staff member as logged in after the on-device check. */
  logIn: (pupilId: string) => void;
  logInStaff: (staffId: string) => void;
  /** Supabase mode: the PIN is checked on the server, then this device gets that pupil's session. */
  pupilSignIn: (classCode: string, pupilId: string, pin: string) => Promise<PupilLoginResult>;
  /** Supabase mode: staff email + password. */
  staffSignIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logOut: (reason?: 'timeout') => void;
  /** Supabase mode: the class list for "Tap your name", fetched from the server by class code. */
  roster: Roster | null;
  loadRoster: (code: string) => Promise<Roster | null>;
  /** Supabase mode: fetch the latest data (on screen focus, pull-to-refresh). */
  refresh: () => Promise<void>;
  /** Supabase mode: class-level views for staff (heatmap, Most asked for). */
  summaries: Record<string, ClassSummary>;
  /** Supabase mode: set when the database couldn't be reached. */
  offline: boolean;
  resumePupilId: string | null;
  cancelResume: () => void;
  timedOut: boolean;
  me: Pupil | null;
  staffMe: Staff | null;
  sharedDevice: boolean;
  setSharedDevice: (shared: boolean) => void;
  rememberedClass: string | null;
  setRememberedClass: (classIdOrCode: string | null) => void;
  t: (key: TextKey, vars?: Record<string, string | number>) => string;
  colors: Colors;
  /** Local mode only. */
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/** Who a Supabase session belongs to: pupils carry pupil_id in app_metadata (set by the server), staff don't. */
function sessionFromAuth(user: { id: string; app_metadata?: Record<string, unknown> } | null | undefined): Session | null {
  if (!user) return null;
  const pupilId = user.app_metadata?.pupil_id;
  return typeof pupilId === 'string' ? { kind: 'pupil', id: pupilId, last: Date.now() } : { kind: 'staff', id: user.id, last: Date.now() };
}

export function AppProvider({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const colors = useColors();
  const [db, setDb] = useState<Db | null>(null);
  const dbRef = useRef<Db | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [rememberedClass, setRemembered] = useState<string | null>(null);
  const [sharedDevice, setShared] = useState(false);
  const [resumePupilId, setResume] = useState<string | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [summaries, setSummaries] = useState<Record<string, ClassSummary>>({});
  const [offline, setOffline] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const lastTouch = useRef(Date.now());
  // saves go out one at a time, in order; a refresh waits for them so it can't show stale data
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  const setData = (d: Db) => {
    dbRef.current = d;
    setDb(d);
  };

  const saveSession = (s: Session | null) => {
    setSession(s);
    if (s) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s)).catch(() => {});
    else AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  /** Supabase mode: load what this person may see. Returns false if the database couldn't be reached. */
  const loadRemote = useCallback(async (s: Session | null): Promise<boolean> => {
    try {
      await saving.current;
      const d = await loadRemoteDb();
      if (s?.kind === 'pupil') {
        const kept = await AsyncStorage.getItem(MEDIA_KEY + s.id).catch(() => null);
        if (kept) applyMedia(d, JSON.parse(kept) as MediaMap);
      }
      setData(d);
      if (s?.kind === 'staff') setSummaries(await loadClassSummaries(d.classes.map((c) => c.id)));
      setOffline(false);
      return true;
    } catch {
      setOffline(true);
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [s, r, sh] = await Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(REMEMBER_KEY), AsyncStorage.getItem(SHARED_KEY)]);
      const shared = sh === '1';
      setShared(shared);
      const saved: Session | null = s ? JSON.parse(s) : null;
      // own device: stay logged in; shared device: only within 20 minutes of the last touch
      const fresh = !shared || (saved != null && Date.now() - saved.last < SHARED_DEVICE_TIMEOUT_MS);

      if (DATA_MODE === 'supabase') {
        if (r) setRemembered(r);
        const { data } = await supabase.auth.getSession();
        const remote = sessionFromAuth(data.session?.user);
        if (!remote || !fresh) {
          if (remote) await supabase.auth.signOut();
          setData(emptyDb());
          return;
        }
        await loadRemote(remote);
        const pupil = remote.kind === 'pupil' ? dbRef.current?.pupils.find((p) => p.id === remote.id) : undefined;
        if (pupil?.settings.pinOnReopen) {
          // the pupil chose "Ask for my PIN when I reopen the app": end this session; the PIN pad starts a new one
          await supabase.auth.signOut();
          setData(emptyDb());
          setResume(pupil.id);
        } else saveSession({ ...remote, last: saved?.last ?? Date.now() });
        if (!dbRef.current) setData(emptyDb());
        return;
      }

      const d = await loadOrSeed();
      const pupil = saved?.kind === 'pupil' ? d.pupils.find((p) => p.id === saved.id) : undefined;
      if (saved && fresh && saved.kind === 'staff' && d.staff.some((x) => x.id === saved.id)) setSession(saved);
      if (saved && fresh && pupil) {
        if (pupil.settings.pinOnReopen) {
          AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
          setResume(pupil.id);
        } else setSession(saved);
      }
      if (r && d.classes.some((c) => c.id === r)) setRemembered(r);
      setData(d);
    })();
  }, [loadRemote]);

  // Shows the change straight away. Supabase mode then sends only what changed (diffDb) as the signed-in person;
  // if that fails, the screen goes back to how it was and a friendly message explains.
  const save = useCallback(async <R,>(fn: (d: Db) => R): Promise<SaveResult<R>> => {
    const prev = dbRef.current!;
    const next = clone(prev);
    const value = fn(next);
    setData(next);
    if (DATA_MODE === 'local') {
      localStore.save(next).catch(() => {});
      return { ok: true, value };
    }
    const s = sessionRef.current;
    const actor: Actor | null = !s ? null : s.kind === 'pupil' ? { kind: 'pupil', id: s.id } : { kind: 'staff', id: s.id, schoolId: prev.staff.find((x) => x.id === s.id)?.schoolId };
    const ops = actor ? diffDb(prev, next, actor) : [];
    if (!ops.length) return { ok: true, value };
    const run = saving.current.then(() => applyWrites(ops));
    saving.current = run.catch(() => {});
    try {
      await run;
      setSaveError(null);
      setOffline(false);
      if (s?.kind === 'pupil') AsyncStorage.setItem(MEDIA_KEY + s.id, JSON.stringify(pickMedia(dbRef.current ?? next))).catch(() => {});
      return { ok: true, value };
    } catch (e) {
      const offlineNow = e instanceof SaveError && e.offline;
      const message = offlineNow
        ? "Can't reach school right now, so that wasn't saved. Your words are still here: try again when you're back online."
        : "That didn't save. Your words are still here: try again, or tell a teacher if it keeps happening.";
      if (offlineNow) setOffline(true);
      setSaveError(message);
      // undo on screen; then fetch what the server really has, in case part of it was saved
      if (dbRef.current === next) setData(prev);
      if (s && !offlineNow) loadRemote(s);
      return { ok: false, message };
    }
  }, [loadRemote]);

  const update = useCallback(<R,>(fn: (d: Db) => R): R => {
    let value!: R;
    save((d) => (value = fn(d)));
    return value;
  }, [save]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

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

  const pupilSignIn = useCallback(
    async (classCode: string, pupilId: string, pin: string) => {
      const res = await pupilLogin(classCode, pupilId, pin);
      if (!res.ok) return res;
      AsyncStorage.setItem(LAST_CODE_KEY, classCode).catch(() => {});
      const s: Session = { kind: 'pupil', id: pupilId, last: Date.now() };
      if (!(await loadRemote(s))) return { ok: false as const, reason: 'server' as const, message: "Can't reach school right now. Check the internet and try again." };
      logIn(pupilId);
      return res;
    },
    [loadRemote, logIn],
  );

  const staffSignIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) return { ok: false, message: 'That email and password do not match. Check them and try again.' };
      const s: Session = { kind: 'staff', id: data.user.id, last: Date.now() };
      if (!(await loadRemote(s))) return { ok: false, message: "Can't reach the school database right now. Try again." };
      logInStaff(data.user.id);
      return { ok: true };
    },
    [loadRemote, logInStaff],
  );

  const logOut = useCallback((reason?: 'timeout') => {
    setTimedOut(reason === 'timeout');
    setSaveError(null);
    saveSession(null);
    if (DATA_MODE === 'supabase') {
      supabase.auth.signOut().catch(() => {});
      setData(emptyDb());
      setSummaries({});
    }
  }, []);

  const loadRoster = useCallback(async (code: string) => {
    // same tidy-up as the server: "8bk4p" and "8B K4P" both become "8B-K4P"
    const c = code.toUpperCase().replace(/[\s-]/g, '');
    const norm = c.length === 5 ? c.slice(0, 2) + '-' + c.slice(2) : c;
    const r = await classRoster(norm);
    if (!r.class) return null;
    const ro: Roster = { code: norm, classId: r.class.id, className: r.class.name, pupils: r.pupils as Roster['pupils'] };
    setRoster(ro);
    return ro;
  }, []);

  const refresh = useCallback(async () => {
    if (DATA_MODE === 'supabase' && sessionRef.current) await loadRemote(sessionRef.current);
  }, [loadRemote]);

  // Leaving the app: a shared device logs out so nothing is left on screen for the next person;
  // on an own device, "Ask for my PIN" locks it until the PIN is entered again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const s = sessionRef.current;
      if (st === 'active' && s && DATA_MODE === 'supabase') loadRemote(s); // fresh data when coming back
      if (st !== 'background' || !s) return;
      if (sharedDevice) {
        logOut();
        return;
      }
      if (s.kind === 'pupil' && dbRef.current?.pupils.find((p) => p.id === s.id)?.settings.pinOnReopen) {
        // lock now; in local mode the saved session is kept so a cold start also lands on the PIN pad
        setSession(null);
        if (DATA_MODE === 'supabase') {
          supabase.auth.signOut().catch(() => {});
          setData(emptyDb());
        }
        setResume(s.id);
      }
    });
    return () => sub.remove();
  }, [sharedDevice, logOut, loadRemote]);

  // Inactivity timeout, on shared devices only: log out after 20 minutes without a touch.
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
    if (DATA_MODE !== 'local') return; // the shared database is never reset from the app
    saveSession(null);
    setRememberedClass(null);
    setData(await resetStore());
  }, [setRememberedClass]);

  const cancelResume = useCallback(() => {
    setResume(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const value = useMemo<AppCtx | null>(() => {
    if (!db) return null;
    return {
      mode: DATA_MODE,
      db,
      update,
      save,
      saveError,
      clearSaveError,
      session,
      logIn,
      logInStaff,
      pupilSignIn,
      staffSignIn,
      logOut,
      roster,
      loadRoster,
      refresh,
      summaries,
      offline,
      resumePupilId,
      cancelResume,
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
  }, [db, update, save, saveError, clearSaveError, session, logIn, logInStaff, pupilSignIn, staffSignIn, logOut, roster, loadRoster, refresh, summaries, offline, resumePupilId, cancelResume, timedOut, sharedDevice, setSharedDevice, rememberedClass, setRememberedClass, colors, resetDemo]);

  if (!value) return <>{loading}</>;
  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }} onTouchStart={onTouch}>
        {children}
      </View>
    </Ctx.Provider>
  );
}

/** Supabase mode: the class code last used to sign in (so "Ask for my PIN" can sign the pupil in again). */
export const lastClassCode = () => AsyncStorage.getItem(LAST_CODE_KEY);
