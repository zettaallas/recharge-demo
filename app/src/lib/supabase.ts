import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The app's Supabase client. URL and anon (public) key come from app/.env.local (never committed).
// The anon key is safe in the app: what it can read is decided by the row-level security rules.
// NOT used by any screen yet; the login screen switches over in the store-swap step.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!url && !!anonKey;

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export type PupilLoginResult =
  | { ok: true; pupil: { id: string; name: string } }
  | { ok: false; reason: 'invalid' | 'locked' | 'server'; message: string };

/** Class code + pupil + PIN -> signs this device in as that pupil (checked on the server by the pupil-login function). */
export async function pupilLogin(classCode: string, pupilId: string, pin: string): Promise<PupilLoginResult> {
  const { data, error } = await supabase.functions.invoke('pupil-login', { body: { classCode, pupilId, pin } });
  if (error) {
    // non-2xx replies carry { error, message } in the response body
    let body: { error?: string; message?: string } = {};
    try {
      body = await (error as { context?: Response }).context?.json();
    } catch {}
    const reason = body.error === 'locked' ? 'locked' : body.error === 'invalid' ? 'invalid' : 'server';
    return { ok: false, reason, message: body.message ?? 'Could not sign in just now. Try again.' };
  }
  const { error: setErr } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setErr) return { ok: false, reason: 'server', message: 'Could not sign in just now. Try again.' };
  return { ok: true, pupil: data.pupil };
}

/** The names for "Tap your name", before anyone is signed in. */
export async function classRoster(classCode: string) {
  const { data, error } = await supabase.functions.invoke('class-roster', { body: { classCode } });
  if (error) return { class: null, pupils: [] as { id: string; name: string; avatar: string; locked: boolean }[] };
  return data as { class: { id: string; name: string } | null; pupils: { id: string; name: string; avatar: string; locked: boolean }[] };
}

/** Staff only: new PINs for these pupils. Returns the PIN cards, shown once. */
export async function setPupilPins(pupilIds: string[]) {
  const { data, error } = await supabase.functions.invoke('set-pupil-pin', { body: { pupilIds } });
  if (error) return { cards: [] as { pupilId: string; name: string; pin: string }[], error: true };
  return { cards: data.cards as { pupilId: string; name: string; pin: string }[], error: false };
}
