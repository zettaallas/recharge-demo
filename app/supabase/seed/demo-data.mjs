// FICTIONAL DEMO DATA ONLY. Every name, note and number here is made up. Never add real pupils or staff.
//
// Builds the rows for the Supabase demo school: the same fictional class 8B the app seeds on a device
// (app/src/data/seed.ts), shaped for the tables in supabase/migrations. Pure: no network, no keys.
// seed-demo.mjs sends these rows to Supabase; the local test loads them into PGlite.

import { randomUUID } from 'node:crypto';

export const DEMO_SCHOOL_NAME = 'Recharge Demo School (fictional)';
export const DEMO_CLASS_CODE = '8B-K4P';
export const DEMO_STAFF = [
  { key: 't1', name: 'Ms Rivera', email: 'demo@recharge.test', role: 'class_teacher' },
  { key: 't2', name: 'Mr Adeyemi', email: 'senco@recharge.test', role: 'senco' },
  { key: 't3', name: 'Mrs Hughes', email: 'keyadult@recharge.test', role: 'key_adult' },
  { key: 't4', name: 'Ms Shah', email: 'dsl@recharge.test', role: 'dsl' },
];
export const QUICK_REPLIES = [
  "I've seen this. Take the time you need.",
  "Thanks for telling me. Let's talk at break time.",
  "Thank you for letting me know. I'm here if you need me.",
];

const SLOTS = [
  ['maths', 'Maths', 'Classroom 8B', 'calc', '9:00'],
  ['chg1', 'Changeover', 'Main corridor', 'door', '10:00'],
  ['break', 'Break', 'Playground', 'tree', '10:45'],
  ['english', 'English', 'Classroom 8B', 'book', '11:05'],
  ['lunch', 'Lunch', 'Lunch hall', 'utensils', '12:15'],
  ['chg2', 'Changeover', 'Main corridor', 'door', '13:10'],
  ['science', 'Science', 'Science lab', 'flask', '13:15'],
  ['pe', 'PE', 'Sports hall', 'run', '14:20'],
];
const ZIP = ['teal', 'lilac', 'sky', 'sun', 'coral'];
const HATS = ['none', 'beanie', 'cap', 'crown', 'headphones', 'flower'];
// name, avatar colour, key adult, base battery, attendance %
const PUPILS = [
  ['Amara O.', 'sun', 't3', 3.9, 96], ['Ben T.', 'sky', 't1', 4.0, 98], ['Chloe W.', 'rose', 't1', 3.8, 95], ['Dev P.', 'leaf', 't3', 3.7, 93],
  ['Elif K.', 'lilac', 't1', 3.9, 97], ['Finn R.', 'coral', 't1', 4.1, 99], ['Grace L.', 'teal', 't1', 3.8, 96], ['Hamza A.', 'slate', 't3', 4.0, 97],
  ['Isla M.', 'lilac', 't1', 0, 97], ['Jayden B.', 'sky', 't1', 3.6, 94], ['Kofi N.', 'sun', 't3', 3.9, 98], ['Lena S.', 'leaf', 't1', 4.0, 96],
];

const DAY = 864e5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function lastSchoolDays(n, today) {
  const out = []; const d = new Date(today); d.setHours(12, 0, 0, 0);
  while (out.length < n) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) out.unshift(iso(d)); }
  return out;
}
// same drift rule as the app (src/domain/drift.ts), so only Isla drifts
function drifting(avgs) {
  const a = avgs.filter((v) => v != null);
  if (a.length < 5) return false;
  const sm = a.slice(1).map((v, i) => (v + a[i]) / 2);
  let drops = 0, start = sm.length - 1;
  for (let i = sm.length - 1; i > 0; i--) {
    const diff = sm[i] - sm[i - 1];
    if (diff < -0.05) { drops++; start = i - 1; } else if (Math.abs(diff) <= 0.1) start = i - 1; else break;
  }
  return drops >= 3 && a[start] - a[a.length - 1] >= 0.6;
}

/**
 * @param staffIds  map from staff key (t1..t4) to their Auth user id
 * @param now       time to build relative dates from
 * Returns rows per table, in insert order. pupil_secrets are left to the caller (PINs are hashed there).
 */
export function buildDemoRows(staffIds, now = Date.now()) {
  const rnd = mulberry32(61);
  const days = lastSchoolDays(6, now);
  const t = (date, hhmm) => new Date(date + 'T' + hhmm + ':00').toISOString();
  const ts = (ms) => new Date(ms).toISOString();

  const school = { id: randomUUID(), name: DEMO_SCHOOL_NAME };
  const staff = DEMO_STAFF.map((s) => ({ id: staffIds[s.key], school_id: school.id, name: s.name, email: s.email, role: s.role }));
  const quick_replies = staff.flatMap((s) => QUICK_REPLIES.map((text, i) => ({ staff_id: s.id, text, position: i })));
  const cls = { id: randomUUID(), school_id: school.id, name: '8B', code: DEMO_CLASS_CODE, teacher_id: staffIds.t1 };
  const slots = SLOTS.map(([key, name, place, icon, time_label], i) => ({ class_id: cls.id, key, name, place, icon, time_label, position: i }));

  const pupils = [];
  const idOf = {};
  PUPILS.forEach(([name, avatar, ka, , attendance], i) => {
    const id = randomUUID();
    idOf[name.split(' ')[0].toLowerCase()] = id;
    pupils.push({
      id, class_id: cls.id, name, avatar, key_adult_id: staffIds[ka], attendance,
      buddy_colour: ZIP[i % 5], buddy_hat: HATS[(i * 2) % 6], parent_share: name === 'Dev P.',
      registered: true, walkthrough_done: true,
    });
  });
  // a new pupil who has never logged in, to try first-login personalisation
  idOf.noor = randomUUID();
  pupils.push({ id: idOf.noor, class_id: cls.id, name: 'Noor H.', avatar: 'rose', key_adult_id: staffIds.t3, attendance: 100,
    buddy_colour: 'teal', buddy_hat: 'none', parent_share: false, registered: false, walkthrough_done: false });

  // six days of battery check-ins; Isla's battery falls
  const EFFECT = { maths: -0.2, chg1: -1.8, break: -0.5, english: 0.1, lunch: -1.7, chg2: -1.8, science: 0.3, pe: -0.4 };
  const DRIFT = [4.4, 4.1, 3.6, 3.0, 2.4, 1.9];
  const checkins = [], ratingsOf = {};
  for (const [name, , , base] of PUPILS) {
    const key = name.split(' ')[0].toLowerCase();
    const isDrift = key === 'isla';
    const series = days.map((date, i) => {
      const b = isDrift ? DRIFT[i] : base + (rnd() - 0.5) * 0.5;
      const r = {};
      for (const [sid] of SLOTS) r[sid] = clamp(Math.round(b + EFFECT[sid] * (isDrift ? 0.6 + i * 0.12 : 1) + (rnd() - 0.5) * (isDrift ? 0.4 : 1.1)), 1, 5);
      return { id: randomUUID(), pupil_id: idOf[key], date, created_at: t(date, '15:10'), _r: r };
    });
    if (!isDrift)
      for (let g = 0; g < 4 && drifting(series.map((c) => avg(Object.values(c._r)))); g++)
        for (const k of Object.keys(series[5]._r)) series[5]._r[k] = clamp(series[5]._r[k] + 1, 1, 5);
    for (const c of series) { ratingsOf[c.id] = c._r; delete c._r; checkins.push(c); }
  }
  const ci = (key, i) => checkins.filter((c) => c.pupil_id === idOf[key])[i];

  // Isla's Recharge Walk places; they become her own check-in places
  const walk_places = [
    { id: randomUUID(), pupil_id: idOf.isla, tag: 'recharges', emoji: '📚', caption: 'The library at break. Quiet, and the beanbags are soft.', created_at: ts(now - DAY * 20) },
    { id: randomUUID(), pupil_id: idOf.isla, tag: 'drains', emoji: '🔊', caption: 'Lunch hall. It echoes and the smells are strong.', created_at: ts(now - DAY * 20) },
  ];
  for (const i of [4, 5]) { ratingsOf[ci('isla', i).id]['pin_' + walk_places[0].id] = 5; ratingsOf[ci('isla', i).id]['pin_' + walk_places[1].id] = 1; }
  const checkin_ratings = Object.entries(ratingsOf).flatMap(([checkin_id, r]) => Object.entries(r).map(([slot_key, rating]) => ({ checkin_id, slot_key, rating })));

  const NOTES = [
    ['isla', 3, 'lunch', { symbols: ['tooLoud', 'tooCrowded'] }],
    ['isla', 4, 'chg1', { text: "Everyone pushes and it is so loud I can't think", help_chips: ['Leave early'] }],
    ['isla', 4, 'lunch', { symbols: ['tooLoud'], help_text: 'eat somewhere quieter' }],
    ['isla', 5, 'lunch', { text: 'I sat in the toilets at lunch because the hall was too much', help_chips: ['Quieter place'] }],
    ['isla', 5, 'chg2', { symbols: ['tooCrowded', 'needBreakSym'] }],
    ['jayden', 5, 'chg1', { text: 'Some boys push me on the stairs and I feel unsafe', help_chips: ['Adult to talk to'] }],
    ['elif', 5, 'lunch', { text: 'Na stołówce jest za głośno i potem boli mnie głowa', help_chips: ['Leave early'], help_text: 'go before the bell' }],
    ['amara', 5, 'lunch', { help_chips: ['Headphones'], help_text: 'headphones at lunch' }],
    ['ben', 4, 'break', { help_chips: ['Break space'], help_text: 'a quiet room at break' }],
    ['chloe', 5, 'english', { help_chips: ['Sit somewhere else'], help_text: 'sit near the door' }],
    ['dev', 5, 'lunch', { help_chips: ['Quieter place'], help_text: 'eat in the library' }],
    ['dev', 3, 'lunch', { symbols: ['tooLoud'], help_chips: ['Quieter place'] }],
    ['finn', 4, 'maths', { help_chips: ['Break space'], help_text: 'more time outside' }],
    ['grace', 5, 'maths', { help_chips: ['Quieter place'], help_text: 'a calm corner in class' }],
    ['hamza', 5, 'pe', { help_chips: ['Adult to talk to'], help_text: 'talk to Mrs Hughes before PE' }],
    ['kofi', 5, 'lunch', { help_chips: ['Quieter place'], help_text: 'lunch with my friends in a smaller room' }],
    ['lena', 4, 'chg2', { help_text: 'walk on the quiet stairs' }],
    ['lena', 5, 'lunch', { symbols: ['tooLoud'], help_chips: ['Headphones'] }],
  ];
  const notes = NOTES.map(([key, i, slot_key, n]) => ({
    checkin_id: ci(key, i).id, slot_key, symbols: n.symbols ?? [], help_chips: n.help_chips ?? [], help_text: n.help_text ?? null, text: n.text ?? null,
  }));

  // requests to the key adult, and Isla's posts (one per status, plus one kept private)
  const talkAt = t(days[5], '12:25'), symAt = t(days[5], '12:20');
  const mTalk = randomUUID(), mSym = randomUUID();
  const moments = [
    { id: mTalk, pupil_id: idOf.isla, kind: 'talk', created_at: talkAt, seen: false },
    { id: mSym, pupil_id: idOf.isla, kind: 'symbol', symbols: ['tooLoud'], created_at: symAt, seen: false },
    { id: randomUUID(), pupil_id: idOf.amara, kind: 'symbol', symbols: ['feelsSafe'], created_at: t(days[4], '10:50'), seen: true },
  ];
  const i4 = ci('isla', 4), i5 = ci('isla', 5);
  const hour = 3600e3, at = (c) => Date.parse(c.created_at);
  const posts = [
    { pupil_id: idOf.isla, kind: 'note', ref_id: i4.id + ':chg1', summary: "Everyone pushes and it is so loud I can't think", shared_with: 'keyAdult', status: 'followUp',
      read_at: ts(at(i4) + hour), follow_up: 'Ms Rivera: you can leave Maths 2 minutes early and use the side stairs from Monday.',
      replied_at: ts(at(i4) + 18 * hour), replied_by: staffIds.t1, created_at: i4.created_at },
    { pupil_id: idOf.isla, kind: 'symbol', ref_id: mSym, summary: 'Too loud', shared_with: 'keyAdult', status: 'read', read_at: ts(Date.parse(symAt) + hour / 2), created_at: symAt },
    { pupil_id: idOf.isla, kind: 'talk', ref_id: mTalk, summary: "I'd like to talk", shared_with: 'keyAdult', status: 'sent', created_at: talkAt },
    { pupil_id: idOf.isla, kind: 'note', ref_id: i5.id + ':lunch', summary: 'I sat in the toilets at lunch because the hall was too much', shared_with: 'private', status: 'sent', created_at: i5.created_at },
  ];

  // Isla's approved profile: built from her own ratings, symbols, places and shared words (never the private note)
  const items = [
    ['drains', 'Main corridor at changeover', 'ratings'], ['drains', 'Lunch hall at lunch', 'ratings'],
    ['drains', 'Places that are too loud', 'symbols'], ['drains', 'Crowded places', 'symbols'], ['drains', 'Going a long time without a break', 'symbols'],
    ['drains', '🔊 Lunch hall. It echoes and the smells are strong.', 'walk'],
    ['helps', '📚 The library at break. Quiet, and the beanbags are soft.', 'walk'], ['helps', 'Leave early', 'help'], ['helps', 'Eat somewhere quieter', 'help'],
    ['words', '"Everyone pushes and it is so loud I can\'t think"', 'typed'],
  ];
  const profiles = [{ pupil_id: idOf.isla, approved_at: ts(now - DAY), dirty: false }];
  const profile_items = items.map(([section, text, src], position) => ({ pupil_id: idOf.isla, section, text, src, hidden: false, position }));
  const profile_snapshots = [{ pupil_id: idOf.isla, items: items.map(([section, text]) => ({ section, text })), approved_at: ts(now - DAY) }];

  const feed_posts = [
    { class_id: cls.id, said: 'The lunch hall is too loud.', did: 'A quiet table by the window is open on Tuesdays and Thursdays, with ear defenders in a basket.', by_staff_id: staffIds.t1, created_at: ts(now - DAY * 9) },
    { class_id: cls.id, said: 'The corridor is crowded after Maths.', did: 'Year 8 can now leave Maths two minutes early and use the side stairs.', by_staff_id: staffIds.t2, created_at: ts(now - DAY * 4) },
  ];
  // the keyword scan in the app flags only Jayden's note ("unsafe")
  const flags = [{ pupil_id: idOf.jayden, source: 'Check-in note: Changeover (Main corridor)', text: 'Some boys push me on the stairs and I feel unsafe', words: ['unsafe'], status: 'open', created_at: ci('jayden', 5).created_at }];
  const parent_notes = [
    { pupil_id: idOf.dev, text: 'Dev came home exhausted on Tuesday and said changing for PE in a busy room was hard.', created_at: ts(now - DAY * 3) },
    { pupil_id: idOf.isla, text: 'Isla has been very quiet at home this week and is not finishing packed lunch.', created_at: ts(now - DAY * 2) },
  ];

  return {
    schools: [school], staff, quick_replies, classes: [cls], slots, pupils, checkins, checkin_ratings, notes, walk_places,
    moments, posts, profiles, profile_items, profile_snapshots, feed_posts, flags, parent_notes,
  };
}

/** Insert order (parents before children). */
export const TABLE_ORDER = [
  'schools', 'staff', 'quick_replies', 'classes', 'slots', 'pupils', 'checkins', 'checkin_ratings', 'notes', 'walk_places',
  'moments', 'posts', 'profiles', 'profile_items', 'profile_snapshots', 'feed_posts', 'flags', 'parent_notes',
];
