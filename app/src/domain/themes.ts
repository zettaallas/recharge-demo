import type { Db, Helpful } from '@/types';

// Groups pupils' "What would help?" answers into themes for staff.
export const THEMES = [
  { id: 'route', label: 'Calmer routes between lessons', kw: ['stairs', 'corridor', 'route', 'walk on', 'other way'] },
  { id: 'timing', label: 'Leaving early to miss the rush', kw: ['early', 'before the bell', 'leave', 'rush', 'first'] },
  { id: 'noise', label: 'Less noise: headphones or ear defenders', kw: ['headphone', 'ear defender', 'loud', 'noise', 'noisy'] },
  { id: 'adult', label: 'A trusted adult to talk to', kw: ['talk', 'adult', 'someone to'] },
  { id: 'seat', label: 'Choosing where to sit', kw: ['sit ', 'sit near', 'seat', 'somewhere else'] },
  { id: 'break', label: 'A place and time for a break', kw: ['break', 'rest', 'outside', 'time out', 'move'] },
  { id: 'quiet', label: 'Quieter places to eat or work', kw: ['quiet', 'calm', 'library', 'peace', 'smaller room', 'alone'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'] | 'other';

export function themeOf(text: string): ThemeId {
  const t = ' ' + text.toLowerCase() + ' ';
  for (const th of THEMES) if (th.kw.some((k) => t.includes(k))) return th.id;
  return 'other';
}

/** Records one pupil's optional answer to "Was this helpful?" on a You said / We did item. Tapping the same answer again clears it. */
export function setHelpful(db: Db, feedId: string, pupilId: string, answer: Helpful): void {
  const item = db.feed.find((f) => f.id === feedId);
  if (!item) return;
  if (item.helpful[pupilId] === answer) delete item.helpful[pupilId];
  else item.helpful[pupilId] = answer;
}

export interface HelpAnswer {
  pupilId: string;
  date: string;
  /** What to quote: the pupil's own words, or their chips if they didn't type. */
  text: string;
  /** Everything, for keyword grouping. */
  all: string;
}

/** Every "What would help?" answer from these pupils' check-ins, leaving out notes a pupil kept private. */
export function helpAnswers(db: Db, pupilIds: Set<string>): HelpAnswer[] {
  const hidden = new Set(db.posts.filter((p) => p.kind === 'note' && p.sharedWith === 'private').map((p) => p.refId));
  const out: HelpAnswer[] = [];
  for (const c of db.checkins) {
    if (!pupilIds.has(c.pupilId)) continue;
    for (const [sid, n] of Object.entries(c.notes || {})) {
      if (hidden.has(c.id + ':' + sid)) continue;
      const parts = [...n.help.chips, ...(n.help.text ? [n.help.text] : [])];
      if (!parts.length) continue;
      out.push({ pupilId: c.pupilId, date: c.date, text: n.help.text || n.help.chips.join(', '), all: parts.join(' ') });
    }
  }
  return out;
}

export interface ThemeGroup {
  id: ThemeId;
  label: string;
  answers: HelpAnswer[];
  pupils: number;
}

/** Groups answers by keyword theme, most asked for first. */
export function groupThemes(answers: HelpAnswer[]): ThemeGroup[] {
  const groups: Partial<Record<ThemeId, HelpAnswer[]>> = {};
  for (const a of answers) (groups[themeOf(a.all)] ??= []).push(a);
  return (Object.entries(groups) as [ThemeId, HelpAnswer[]][])
    .map(([id, list]) => ({
      id,
      label: id === 'other' ? 'Other ideas' : THEMES.find((t) => t.id === id)!.label,
      answers: list,
      pupils: new Set(list.map((x) => x.pupilId)).size,
    }))
    .sort((a, b) => b.answers.length - a.answers.length);
}

/** "Was this helpful?" answers on one You said / We did post. */
export function helpfulTally(item: Db['feed'][number]): { yes: number; notReally: number } {
  const v = Object.values(item.helpful);
  return { yes: v.filter((x) => x === 'yes').length, notReally: v.filter((x) => x === 'notReally').length };
}
