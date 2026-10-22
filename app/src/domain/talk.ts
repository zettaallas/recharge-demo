import { addPost } from './posts';
import { raiseFlag } from './safeguarding';
import { uid } from './util';
import type { Db, SlotId, TalkTopic } from '@/types';

// "Ask to talk to my teacher": one tap asks the key adult for a chat. Topic pictures, words and place are all optional.
// It shows in the key adult's list and in the pupil's posts, where the reply (Follow-up) will appear.
export function requestTalk(
  db: Db,
  pupilId: string,
  summary: string,
  opts: { text?: string; where?: SlotId; whereLabel?: string; topics?: TalkTopic[]; topicLabels?: string[] },
): boolean {
  const id = uid('m');
  const text = opts.text?.trim() || undefined;
  const topics = opts.topics?.length ? opts.topics : undefined;
  db.moments.unshift({ id, pupilId, kind: 'talk', topics, where: opts.where, text, at: Date.now(), seen: false });
  const about = opts.topicLabels?.length ? opts.topicLabels.join(', ') : undefined;
  addPost(db, { pupilId, kind: 'talk', refId: id, summary: [summary, about, opts.whereLabel, text].filter(Boolean).join(' · '), sharedWith: 'keyAdult' });
  return text ? raiseFlag(db, pupilId, 'Talk request', text) : false;
}
