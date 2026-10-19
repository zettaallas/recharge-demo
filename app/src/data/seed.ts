// Fictional demo data only. Never add real pupils.
// Ported from buildSeed() in the web prototype (index.html), plus seeded posts for the new
// Sent / Read / Follow-up statuses.
import { makeSecret } from '@/domain/auth';
import { slotLabel } from '@/domain/checkins';
import { driftInfo } from '@/domain/drift';
import { approveProfile, syncProfile } from '@/domain/profile';
import { raiseFlag } from '@/domain/safeguarding';
import { avg, clamp, lastSchoolDays, mulberry32, uid } from '@/domain/util';
import type { AvatarColour, CheckIn, Db, Note, Pupil, Rating, Staff } from '@/types';
import { HATS, SLOT_DEFS, ZIP_COLOURS } from './vocab';

export const DEMO = { classCode: '8B-K4P', pupilPin: '1234', staffPassword: 'demo1234' };

const DAY = 864e5;

export async function buildSeed(): Promise<Db> {
  const rnd = mulberry32(61);
  const days = lastSchoolDays(6);

  const staffBase: Omit<Staff, 'salt' | 'pwHash'>[] = [
    { id: 't1', name: 'Ms Rivera', email: 'demo@recharge.test', role: 'class_teacher' },
    { id: 't2', name: 'Mr Adeyemi', email: 'senco@recharge.test', role: 'senco' },
    { id: 't3', name: 'Mrs Hughes', email: 'keyadult@recharge.test', role: 'key_adult' },
    { id: 't4', name: 'Ms Shah', email: 'dsl@recharge.test', role: 'dsl' },
  ];
  const staff: Staff[] = [];
  for (const s of staffBase) {
    const sec = await makeSecret(DEMO.staffPassword);
    staff.push({ ...s, salt: sec.salt, pwHash: sec.hash });
  }

  // name, avatar colour, key adult, base battery, attendance %
  const P: [string, AvatarColour, string, number, number][] = [
    ['Amara O.', 'sun', 't3', 3.9, 96], ['Ben T.', 'sky', 't1', 4.0, 98], ['Chloe W.', 'rose', 't1', 3.8, 95], ['Dev P.', 'leaf', 't3', 3.7, 93],
    ['Elif K.', 'lilac', 't1', 3.9, 97], ['Finn R.', 'coral', 't1', 4.1, 99], ['Grace L.', 'teal', 't1', 3.8, 96], ['Hamza A.', 'slate', 't3', 4.0, 97],
    ['Isla M.', 'lilac', 't1', 0, 97], ['Jayden B.', 'sky', 't1', 3.6, 94], ['Kofi N.', 'sun', 't3', 3.9, 98], ['Lena S.', 'leaf', 't1', 4.0, 96],
  ];
  const pupils: Pupil[] = [];
  const baseOf: Record<string, number> = {};
  for (const [name, avatar, keyAdultId, base, attendance] of P) {
    const sec = await makeSecret(DEMO.pupilPin);
    const id = 'p_' + name.split(' ')[0].toLowerCase();
    baseOf[id] = base;
    pupils.push({
      id, classId: 'c8b', name, avatar, keyAdultId, attendance,
      salt: sec.salt, pinHash: sec.hash, failed: 0, locked: false,
      buddy: { colour: ZIP_COLOURS[pupils.length % 5], hat: HATS[(pupils.length * 2) % 6] },
      parentShare: false,
      // Demo pupils count as already registered so the walkthrough can be tried from settings.
      settings: { showReadReceipts: true, helps: [], pinOnReopen: false, registered: true, walkthroughDone: true },
    });
  }

  const EFFECT: Record<string, number> = { maths: -0.2, chg1: -1.8, break: -0.5, english: 0.1, lunch: -1.7, chg2: -1.8, science: 0.3, pe: -0.4 };
  const DRIFT = [4.4, 4.1, 3.6, 3.0, 2.4, 1.9];
  const checkins: CheckIn[] = [];
  const dayAvg = (r: Record<string, number>) => avg(Object.values(r));
  for (const p of pupils) {
    const isDrift = p.id === 'p_isla';
    const series: CheckIn[] = [];
    days.forEach((date, i) => {
      const b = isDrift ? DRIFT[i] : baseOf[p.id] + (rnd() - 0.5) * 0.5;
      const ratings: Record<string, Rating> = {};
      for (const s of SLOT_DEFS) {
        const eff = EFFECT[s.id] * (isDrift ? 0.6 + i * 0.12 : 1);
        ratings[s.id] = clamp(Math.round(b + eff + (rnd() - 0.5) * (isDrift ? 0.4 : 1.1)), 1, 5) as Rating;
      }
      series.push({ id: uid('ci'), pupilId: p.id, date, ratings, notes: {}, at: new Date(date + 'T15:10:00').getTime() });
    });
    if (!isDrift) {
      // only Isla should show a drift alert
      for (let guard = 0; guard < 4 && driftInfo(series.map((c) => dayAvg(c.ratings))); guard++) {
        const last = series[series.length - 1];
        for (const k of Object.keys(last.ratings)) last.ratings[k] = clamp(last.ratings[k] + 1, 1, 5) as Rating;
      }
    }
    checkins.push(...series);
  }

  const ci = (pid: string, i: number) => checkins.filter((c) => c.pupilId === pid)[i];
  const note = (pid: string, i: number, slot: string, n: Partial<Note>) => {
    ci(pid, i).notes[slot] = { symbols: [], help: { chips: [], text: '' }, ...n };
  };
  note('p_isla', 3, 'lunch', { symbols: ['tooLoud', 'tooCrowded'] });
  note('p_isla', 4, 'chg1', { text: "Everyone pushes and it is so loud I can't think", help: { chips: ['Leave early'], text: '' } });
  note('p_isla', 4, 'lunch', { symbols: ['tooLoud'], help: { chips: [], text: 'eat somewhere quieter' } });
  note('p_isla', 5, 'lunch', { text: 'I sat in the toilets at lunch because the hall was too much', help: { chips: ['Quieter place'], text: '' } });
  note('p_isla', 5, 'chg2', { symbols: ['tooCrowded', 'needBreakSym'] });
  note('p_jayden', 5, 'chg1', { text: 'Some boys push me on the stairs and I feel unsafe', help: { chips: ['Adult to talk to'], text: '' } });
  note('p_elif', 5, 'lunch', { text: 'Na stołówce jest za głośno i potem boli mnie głowa', help: { chips: ['Leave early'], text: 'go before the bell' } });
  note('p_amara', 5, 'lunch', { help: { chips: ['Headphones'], text: 'headphones at lunch' } });
  note('p_ben', 4, 'break', { help: { chips: ['Break space'], text: 'a quiet room at break' } });
  note('p_chloe', 5, 'english', { help: { chips: ['Sit somewhere else'], text: 'sit near the door' } });
  note('p_dev', 5, 'lunch', { help: { chips: ['Quieter place'], text: 'eat in the library' } });
  note('p_dev', 3, 'lunch', { symbols: ['tooLoud'], help: { chips: ['Quieter place'], text: '' } });
  note('p_finn', 4, 'maths', { help: { chips: ['Break space'], text: 'more time outside' } });
  note('p_grace', 5, 'maths', { help: { chips: ['Quieter place'], text: 'a calm corner in class' } });
  note('p_hamza', 5, 'pe', { help: { chips: ['Adult to talk to'], text: 'talk to Mrs Hughes before PE' } });
  note('p_kofi', 5, 'lunch', { help: { chips: ['Quieter place'], text: 'lunch with my friends in a smaller room' } });
  note('p_lena', 4, 'chg2', { help: { chips: [], text: 'walk on the quiet stairs' } });
  note('p_lena', 5, 'lunch', { symbols: ['tooLoud'], help: { chips: ['Headphones'], text: '' } });

  const now = Date.now();
  const pins: Db['pins'] = [
    { id: 'pin_lib', pupilId: 'p_isla', photo: null, tag: 'recharges', emoji: '📚', caption: 'The library at break. Quiet, and the beanbags are soft.', at: now - DAY * 20 },
    { id: 'pin_hall', pupilId: 'p_isla', photo: null, tag: 'drains', emoji: '🔊', caption: 'Lunch hall. It echoes and the smells are strong.', at: now - DAY * 20 },
  ];
  ci('p_isla', 4).ratings['pin_pin_lib'] = 5;
  ci('p_isla', 4).ratings['pin_pin_hall'] = 1;
  ci('p_isla', 5).ratings['pin_pin_lib'] = 5;
  ci('p_isla', 5).ratings['pin_pin_hall'] = 1;
  pupils.find((p) => p.id === 'p_dev')!.parentShare = true;

  const breakAt = new Date(days[5] + 'T12:25:00').getTime();
  const symAt = new Date(days[5] + 'T12:20:00').getTime();
  const moments: Db['moments'] = [
    { id: 'm_isla_break', pupilId: 'p_isla', kind: 'break', at: breakAt, seen: false },
    { id: 'm_isla_sym', pupilId: 'p_isla', kind: 'symbol', symbol: 'tooLoud', at: symAt, seen: false },
    { id: 'm_amara_sym', pupilId: 'p_amara', kind: 'symbol', symbol: 'feelsSafe', at: new Date(days[4] + 'T10:50:00').getTime(), seen: true },
  ];

  // Isla's earlier posts, one per status, plus one kept private.
  const isla4 = ci('p_isla', 4);
  const isla5 = ci('p_isla', 5);
  const posts: Db['posts'] = [
    { id: 'post_1', pupilId: 'p_isla', kind: 'note', refId: isla4.id, summary: "Everyone pushes and it is so loud I can't think", sharedWith: 'keyAdult', status: 'followUp', readAt: isla4.at + 3600e3, followUp: 'Ms Rivera: you can leave Maths 2 minutes early and use the side stairs from Monday.', repliedAt: isla4.at + 18 * 3600e3, at: isla4.at },
    { id: 'post_2', pupilId: 'p_isla', kind: 'symbol', refId: 'm_isla_sym', summary: 'Too loud', sharedWith: 'keyAdult', status: 'read', readAt: symAt + 1800e3, at: symAt },
    { id: 'post_3', pupilId: 'p_isla', kind: 'break', refId: 'm_isla_break', summary: 'I need a break', sharedWith: 'keyAdult', status: 'sent', at: breakAt },
    { id: 'post_4', pupilId: 'p_isla', kind: 'note', refId: isla5.id, summary: 'I sat in the toilets at lunch because the hall was too much', sharedWith: 'private', status: 'sent', at: isla5.at },
  ];

  const db: Db = {
    version: 3,
    seededAt: now,
    staff,
    pupils,
    checkins,
    pins,
    classes: [{ id: 'c8b', name: '8B', code: DEMO.classCode, teacherId: 't1' }],
    slots: { c8b: SLOT_DEFS.map((s) => ({ ...s })) },
    profiles: {},
    feed: [
      { id: 'f1', classId: 'c8b', said: 'The lunch hall is too loud.', did: 'A quiet table by the window is open on Tuesdays and Thursdays, with ear defenders in a basket.', by: 'Ms Rivera', at: now - DAY * 9, helpful: {} },
      { id: 'f2', classId: 'c8b', said: 'The corridor is crowded after Maths.', did: 'Year 8 can now leave Maths two minutes early and use the side stairs.', by: 'Mr Adeyemi', at: now - DAY * 4, helpful: {} },
    ],
    moments,
    posts,
    parentNotes: [
      { id: 'pn1', pupilId: 'p_dev', text: 'Dev came home exhausted on Tuesday and said changing for PE in a busy room was hard.', at: now - DAY * 3 },
      { id: 'pn2', pupilId: 'p_isla', text: 'Isla has been very quiet at home this week and is not finishing packed lunch.', at: now - DAY * 2 },
    ],
    flags: [],
  };

  for (const c of db.checkins)
    for (const [sid, n] of Object.entries(c.notes))
      raiseFlag(db, c.pupilId, 'Check-in note: ' + slotLabel(db, c.pupilId, sid), [n.text, n.help?.text].filter(Boolean).join(' '), c.at);
  syncProfile(db, 'p_isla');
  approveProfile(db, 'p_isla');
  return db;
}
