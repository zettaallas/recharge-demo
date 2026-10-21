// class-roster: class code -> the names to tap on the "Tap your name" screen, before anyone is signed in.
// Returns only what that screen shows: first name and initial, avatar colour, and whether the account is paused.
// An unknown code gets an empty list, the same as a class with no pupils.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { cors, json, normaliseCode } from '../_shared/http.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let code = '';
  try {
    code = normaliseCode((await req.json()).classCode);
  } catch {
    return json({ class: null, pupils: [] });
  }

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: cls } = await admin.from('classes').select('id, name').eq('code', code).maybeSingle();
  if (!cls) return json({ class: null, pupils: [] });

  const { data: pupils } = await admin
    .from('pupils')
    .select('id, name, avatar, pupil_secrets(locked)')
    .eq('class_id', cls.id)
    .order('name');

  return json({
    class: { id: cls.id, name: cls.name },
    pupils: (pupils ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      // pupil_secrets is one-to-one; the join comes back as an object or a one-item list
      locked: Boolean((Array.isArray(p.pupil_secrets) ? p.pupil_secrets[0] : p.pupil_secrets)?.locked),
    })),
  });
});
