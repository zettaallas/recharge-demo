import { addPost } from './posts';
import { raiseFlag } from './safeguarding';
import { uid } from './util';
import type { Db, SlotId } from '@/types';

// "Ask to talk to my teacher": one tap asks the key adult for a chat. Details and place are optional.
// It shows in the key adult's list and in the pupil's posts, where the reply (Follow-up) will appear.
export function requestTalk(db: Db, pupilId: string, summary: string, opts: { text?: string; where?: SlotId; whereLabel?: string }): boolean {
  const id = uid('m');
  const text = opts.text?.trim() || undefined;
  db.moments.unshift({ id, pupilId, kind: 'talk', where: opts.where, text, at: Date.now(), seen: false });
  addPost(db, { pupilId, kind: 'talk', refId: id, summary: [summary, opts.whereLabel, text].filter(Boolean).join(' · '), sharedWith: 'keyAdult' });
  return text ? raiseFlag(db, pupilId, 'Talk request', text) : false;
}
