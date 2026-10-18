import type { TextKey } from '@/i18n';
import type { PostKind } from '@/types';
import type { IconName } from './icons';

// How each kind of post is labelled in "My posts", and how its date is shown.
export const KIND: Record<PostKind, { icon: IconName; label: TextKey }> = {
  note: { icon: 'battery', label: 'kindNote' },
  symbol: { icon: 'grid', label: 'kindSymbol' },
  break: { icon: 'pause', label: 'kindBreak' },
  pin: { icon: 'camera', label: 'kindPin' },
};

export const postDate = (at: number) =>
  new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
  ', ' +
  new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
