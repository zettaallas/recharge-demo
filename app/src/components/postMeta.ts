import type { TextKey } from '@/i18n';
import type { PostKind } from '@/types';
import type { IconName } from './icons';

// How each kind of post is labelled in "My posts", and how its date is shown.
export const KIND: Record<PostKind, { icon: IconName; label: TextKey }> = {
  note: { icon: 'battery', label: 'kindNote' },
  symbol: { icon: 'grid', label: 'kindSymbol' },
  break: { icon: 'pause', label: 'kindBreak' },
  pin: { icon: 'camera', label: 'kindPin' },
  talk: { icon: 'message', label: 'kindTalk' },
};

export const postDate = (at: number) =>
  new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
  ', ' +
  new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** When a reply was sent: "Today 14:05", "Yesterday 14:05", or "Mon 12 Oct, 14:05". */
export function replyTime(at: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => x.toDateString();
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day(d) === day(now)) return 'Today ' + time;
  if (day(d) === day(yesterday)) return 'Yesterday ' + time;
  return postDate(at);
}
