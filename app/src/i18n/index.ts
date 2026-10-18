import type { Lang } from '@/types';
import { SLOT_I18N, STRINGS, type Strings } from './strings';

export { LANGS } from './strings';

type TextKey = { [K in keyof Strings]: Strings[K] extends string ? K : never }[keyof Strings];

/** Looks up a string and fills {placeholders}. Falls back to English. */
export function translate(lang: Lang, key: TextKey, vars?: Record<string, string | number>): string {
  const s = (STRINGS[lang]?.[key] ?? STRINGS.en[key]) as string;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}

export function chips(lang: Lang, key: 'captionChips' | 'helpChips'): string[] {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key];
}

/** Translates a slot or place name, e.g. "Lunch hall". */
export function slotText(lang: Lang, s: string): string {
  return SLOT_I18N[lang]?.[s] ?? s;
}

export type { TextKey };
