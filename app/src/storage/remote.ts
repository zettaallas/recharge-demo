import { supabase } from '@/lib/supabase';
import type { Db } from '@/types';
import { REMOTE_TABLES, rowsToDb, type RemoteRows } from './supabaseMap';
import type { WriteOp } from './writes';

// Reading from Supabase. Everything goes through the signed-in person's own session with the normal (anon) key,
// so the access rules decide what comes back. The service key is never used in the app.

export class OfflineError extends Error {}

/** Loads everything the signed-in person may see, in the app's Db shape. */
export async function loadRemoteDb(): Promise<Db> {
  const results = await Promise.all(REMOTE_TABLES.map((t) => supabase.from(t).select('*').range(0, 9999)));
  const rows = {} as RemoteRows;
  REMOTE_TABLES.forEach((t, i) => {
    const res = results[i];
    // a network failure is an error; a table someone may not read just comes back empty
    if (res.error && /fetch|network|Failed to/i.test(res.error.message)) throw new OfflineError(res.error.message);
    rows[t] = res.data ?? [];
  });
  return rowsToDb(rows);
}

export interface ClassSummary {
  /** class_heatmap(): average battery per place per day, never individual ratings */
  heatmap: { slot_key: string; date: string; average: number; pupils: number }[];
  /** class_help_answers(): anonymous "What would help?" answers, without private notes */
  help: { text: string; chips: string[]; date: string }[];
}

/** Class-level views for staff (heatmap, Most asked for), from the summary functions. */
export async function loadClassSummaries(classIds: string[]): Promise<Record<string, ClassSummary>> {
  const out: Record<string, ClassSummary> = {};
  await Promise.all(
    classIds.map(async (id) => {
      const [h, a] = await Promise.all([supabase.rpc('class_heatmap', { cls: id }), supabase.rpc('class_help_answers', { cls: id })]);
      out[id] = { heatmap: (h.data ?? []).map((x: any) => ({ ...x, average: Number(x.average) })), help: a.data ?? [] };
    }),
  );
  return out;
}

/** Thrown when a save didn't go through. `offline` means the database couldn't be reached at all. */
export class SaveError extends Error {
  constructor(message: string, public offline: boolean) {
    super(message);
  }
}

/** Sends the writes from diffDb() in order. Stops at the first one that fails.
 *  Nothing asks for rows back, so a pupil can raise a flag without being able to read flags. */
export async function applyWrites(ops: WriteOp[]): Promise<void> {
  for (const w of ops) {
    const t = supabase.from(w.table);
    let res: { error: { message: string } | null; count?: number | null };
    if (w.op === 'insert') res = await t.insert(w.rows);
    else if (w.op === 'update') res = await t.update(w.values, { count: 'exact' }).match(w.match);
    else res = await t.delete({ count: 'exact' }).match(w.match);
    if (res.error) throw new SaveError(w.op + ' ' + w.table + ': ' + res.error.message, /fetch|network|Failed to/i.test(res.error.message));
    // the access rules hide rows someone may not change, so an update that changed 0 rows wasn't allowed
    // (a delete of 0 rows is fine: the row is already gone)
    if (w.op === 'update' && res.count === 0) throw new SaveError(w.op + ' ' + w.table + ': no row changed', false);
  }
}
