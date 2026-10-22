import type { ClassSummary } from '@/storage/remote';
import { helpAnswers, type HelpAnswer } from '@/domain/themes';
import type { Db } from '@/types';

// Class-level data for staff screens. Local mode works it out from the check-ins on this device; Supabase mode
// uses the server's summary functions, because a class teacher may not read individual check-ins there.

export function classHelpAnswers(mode: 'local' | 'supabase', db: Db, pupilIds: Set<string>, summary?: ClassSummary): HelpAnswer[] {
  if (mode === 'local') return helpAnswers(db, pupilIds);
  // anonymous on the server: no pupil ids, so each answer counts as its own "pupil"
  return (summary?.help ?? []).map((a, i) => ({ pupilId: 'anon' + i, date: a.date, text: a.text, all: [...a.chips, a.text].join(' ') }));
}

/** How many pupils checked in on the latest day. */
export function checkedInLatest(mode: 'local' | 'supabase', db: Db, pupilIds: Set<string>, summary?: ClassSummary): { date?: string; n: number } {
  if (mode === 'supabase' && summary) {
    const date = summary.heatmap.map((c) => c.date).sort().pop();
    return { date, n: Math.max(0, ...summary.heatmap.filter((c) => c.date === date).map((c) => c.pupils)) };
  }
  const date = db.checkins.filter((c) => pupilIds.has(c.pupilId)).map((c) => c.date).sort().pop();
  return { date, n: date ? new Set(db.checkins.filter((c) => c.date === date && pupilIds.has(c.pupilId)).map((c) => c.pupilId)).size : 0 };
}
