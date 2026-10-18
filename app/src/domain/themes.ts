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
