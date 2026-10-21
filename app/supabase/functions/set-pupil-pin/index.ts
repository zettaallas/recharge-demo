// set-pupil-pin: new PINs for one or more pupils, for the "Class & PINs" screen.
// Only the pupil's class teacher, or the SENCO of the same school, may do this (the same rule as the app).
// The PIN is made here, stored only as a PBKDF2 hash, unlocks the account, and is returned ONCE for the PIN card.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { cors, json } from '../_shared/http.ts';
import { hashPin, newSalt, randomPin } from '../_shared/pin.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // Who is calling? Must be a signed-in staff member.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: who } = await asCaller.auth.getUser();
  if (!who?.user) return json({ error: 'unauthorised' }, 401);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: staff } = await admin.from('staff').select('id, role, school_id').eq('id', who.user.id).maybeSingle();
  if (!staff || (staff.role !== 'class_teacher' && staff.role !== 'senco')) return json({ error: 'forbidden' }, 403);

  let pupilIds: string[] = [];
  try {
    pupilIds = ((await req.json()).pupilIds ?? []).map(String).slice(0, 60);
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  if (!pupilIds.length) return json({ error: 'bad request' }, 400);

  const { data: pupils } = await admin.from('pupils').select('id, name, classes!inner(id, school_id, teacher_id)').in('id', pupilIds);
  const cards: { pupilId: string; name: string; pin: string }[] = [];
  for (const p of pupils ?? []) {
    const cls = Array.isArray(p.classes) ? p.classes[0] : p.classes;
    const allowed =
      cls.school_id === staff.school_id && (staff.role === 'senco' || (staff.role === 'class_teacher' && cls.teacher_id === staff.id));
    if (!allowed) continue; // skip, rather than reveal anything about pupils this person can't manage
    const pin = randomPin();
    const salt = newSalt();
    const { error } = await admin.from('pupil_secrets').upsert({
      pupil_id: p.id,
      pin_hash: await hashPin(pin, salt),
      salt,
      failed: 0,
      locked: false,
      updated_at: new Date().toISOString(),
    });
    if (!error) cards.push({ pupilId: p.id, name: p.name, pin });
  }
  return json({ cards });
});
