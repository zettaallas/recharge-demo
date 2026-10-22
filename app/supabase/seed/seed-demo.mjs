// FICTIONAL DEMO DATA ONLY. Seeds the Supabase demo school (class 8B) with made-up pupils, staff and notes.
//
// Run from the app folder, with the service-role key set ONLY in your terminal for this one command:
//   PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host 'Paste the service_role key'; node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON supabase/seed/seed-demo.mjs; Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
//   Git Bash:    read -rs -p 'Paste the service_role key: ' SUPABASE_SERVICE_ROLE_KEY; export SUPABASE_SERVICE_ROLE_KEY; node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON supabase/seed/seed-demo.mjs; unset SUPABASE_SERVICE_ROLE_KEY
// The key is typed at a prompt, so it is never saved in the shell's history file.
// (the --disable-warning flag only hides Node's note about loading the shared pin.ts file; it's harmless)
// Options:
//   --dry-run   build everything and print counts, without touching Supabase (no key needed)
//   --reset     delete the demo school (and its demo sign-in users) first, then seed it again
// Optional env: STAFF_PASSWORD (otherwise a random password per staff account is made and printed ONCE),
//               PUPIL_PIN (default 1234, the app's fictional demo PIN).
//
// Safety: it only ever touches the school named DEMO_SCHOOL_NAME, the four demo staff emails and the
// pupils' hidden sign-in users. The service-role key is read from the environment and never written anywhere.

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashPin, newSalt } from '../functions/_shared/pin.ts';
import { buildDemoRows, DEMO_CLASS_CODE, DEMO_SCHOOL_NAME, DEMO_STAFF, TABLE_ORDER } from './demo-data.mjs';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const RESET = args.has('--reset');
if (existsSync('.env.local')) process.loadEnvFile('.env.local'); // URL only; the service key is never kept there
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PIN = process.env.PUPIL_PIN ?? '1234';
if (!/^\d{4}$/.test(PIN)) throw new Error('PUPIL_PIN must be 4 digits');

const password = () => process.env.STAFF_PASSWORD || randomBytes(9).toString('base64url');

if (DRY) {
  const ids = Object.fromEntries(DEMO_STAFF.map((s) => [s.key, crypto.randomUUID()]));
  const rows = buildDemoRows(ids);
  for (const tbl of TABLE_ORDER) console.log(tbl.padEnd(18), rows[tbl].length);
  console.log('pupil_secrets'.padEnd(18), rows.pupils.length, '(PIN hashes made at seed time)');
  console.log('\nDry run only: nothing was sent to Supabase.');
  process.exit(0);
}
if (!URL || !KEY) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL (in .env.local) and SUPABASE_SERVICE_ROLE_KEY (in this terminal only).');
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const must = (res, what) => {
  if (res.error) throw new Error(what + ': ' + res.error.message);
  return res.data;
};

async function allAuthUsers() {
  const out = [];
  for (let page = 1; ; page++) {
    const { users } = must(await admin.auth.admin.listUsers({ page, perPage: 200 }), 'list users');
    out.push(...users);
    if (users.length < 200) return out;
  }
}
const isDemoAuthUser = (u) =>
  DEMO_STAFF.some((s) => s.email === u.email) || /^pupil-[0-9a-f-]{36}@pupils\.recharge\.invalid$/.test(u.email ?? '');

// 1. Already seeded?
const existing = must(await admin.from('schools').select('id').eq('name', DEMO_SCHOOL_NAME), 'find demo school');
if (existing.length && !RESET) {
  console.log(`"${DEMO_SCHOOL_NAME}" already exists. Nothing changed. Run with --reset to rebuild it.`);
  process.exit(0);
}

// 2. --reset: remove only the demo school (its rows go with it) and the demo sign-in users
if (existing.length) {
  for (const s of existing) must(await admin.from('schools').delete().eq('id', s.id), 'delete demo school');
  console.log('Removed the old demo school.');
}
const demoUsers = (await allAuthUsers()).filter(isDemoAuthUser);
for (const u of demoUsers) must(await admin.auth.admin.deleteUser(u.id), 'delete demo user ' + u.email);
if (demoUsers.length) console.log(`Removed ${demoUsers.length} old demo sign-in users.`);

// 3. Staff sign-in users
const staffIds = {};
const logins = [];
for (const s of DEMO_STAFF) {
  const pw = password();
  const user = must(await admin.auth.admin.createUser({ email: s.email, password: pw, email_confirm: true, app_metadata: { kind: 'staff' } }), 'create ' + s.email);
  staffIds[s.key] = user.user.id;
  logins.push([s.name, s.role, s.email, pw]);
}

// 4. School data, parents before children
const rows = buildDemoRows(staffIds);
for (const tbl of TABLE_ORDER) if (rows[tbl].length) must(await admin.from(tbl).insert(rows[tbl]), 'insert ' + tbl);

// 5. PIN hashes (PBKDF2, the same code the sign-in function uses)
const secrets = [];
for (const p of rows.pupils) {
  const salt = newSalt();
  secrets.push({ pupil_id: p.id, pin_hash: await hashPin(PIN, salt), salt, failed: 0, locked: false });
}
must(await admin.from('pupil_secrets').insert(secrets), 'insert pupil_secrets');

// 6. Print the logins ONCE. They are not saved anywhere: copy them now.
console.log(`\nSeeded "${DEMO_SCHOOL_NAME}" (fictional). Class code ${DEMO_CLASS_CODE}, ${rows.pupils.length} pupils, PIN ${PIN} for every pupil.`);
console.log('\nStaff logins (shown once, not saved):');
for (const [name, role, email, pw] of logins) console.log(`  ${name.padEnd(11)} ${role.padEnd(13)} ${email.padEnd(24)} ${pw}`);
