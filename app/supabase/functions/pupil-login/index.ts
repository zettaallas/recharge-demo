// pupil-login: class code + pupil + 4-digit PIN -> a Supabase session for that one pupil.
//
// Pupils have no email or password. After the PIN check, this function signs the pupil in as their own
// server-managed Auth user ("shadow user"), whose app_metadata carries pupil_id. app_metadata can only be
// set with the service role, so a pupil can never change it; the access rules read it via current_pupil_id().
//
// Uses the env vars Supabase provides to every Edge Function (SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY). The service-role key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { cors, json, normaliseCode } from '../_shared/http.ts';
import { afterAttempt, hashPin, newSalt, verifyPin } from '../_shared/pin.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// One message for a wrong class, wrong pupil or wrong PIN, so nobody can probe which part was wrong.
const INVALID = { error: 'invalid', message: "That didn't match. Check your class, name and PIN." };
const LOCKED = { error: 'locked', message: 'Your account is paused. Ask your teacher to reset your PIN.' };

const randomPassword = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const shadowEmail = (pupilId: string) => `pupil-${pupilId}@pupils.recharge.invalid`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: { classCode?: string; pupilId?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return json(INVALID, 401);
  }
  const code = normaliseCode(body.classCode ?? '');
  const pupilId = String(body.pupilId ?? '');
  const pin = String(body.pin ?? '');
  if (!/^\d{4}$/.test(pin) || !/^[0-9a-f-]{36}$/i.test(pupilId)) return json(INVALID, 401);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: pupil } = await admin
    .from('pupils')
    .select('id, name, class_id, classes!inner(code)')
    .eq('id', pupilId)
    .eq('classes.code', code)
    .maybeSingle();
  const { data: secret } = pupil
    ? await admin.from('pupil_secrets').select('pin_hash, salt, failed, locked, auth_user_id').eq('pupil_id', pupilId).maybeSingle()
    : { data: null };

  if (!pupil || !secret) {
    // spend the same time as a real check, so a wrong class or pupil isn't faster than a wrong PIN
    await hashPin(pin, newSalt());
    return json(INVALID, 401);
  }
  if (secret.locked) return json(LOCKED, 423);

  const correct = await verifyPin(pin, secret.salt, secret.pin_hash);
  const next = afterAttempt({ failed: secret.failed, locked: secret.locked }, correct);
  await admin.from('pupil_secrets').update({ failed: next.failed, locked: next.locked, updated_at: new Date().toISOString() }).eq('pupil_id', pupilId);
  if (!next.ok) return json(next.locked ? LOCKED : INVALID, next.locked ? 423 : 401);

  // Right PIN: make sure the pupil's shadow user exists, give it a fresh random password, and sign in with it.
  const email = shadowEmail(pupilId);
  const password = randomPassword();
  const meta = { app_metadata: { pupil_id: pupilId, kind: 'pupil' } };
  let userId = secret.auth_user_id as string | null;
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password, ...meta });
    if (error) userId = null;
  }
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, ...meta });
    if (error || !data.user) return json({ error: 'server', message: 'Could not sign in just now. Try again.' }, 500);
    userId = data.user.id;
    await admin.from('pupil_secrets').update({ auth_user_id: userId }).eq('pupil_id', pupilId);
  }

  const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr || !signed.session) return json({ error: 'server', message: 'Could not sign in just now. Try again.' }, 500);

  return json({
    pupil: { id: pupil.id, name: pupil.name },
    session: {
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      expires_at: signed.session.expires_at,
    },
  });
});
