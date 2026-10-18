import { en, type Strings } from './strings';

type TextKey = { [K in keyof Strings]: Strings[K] extends string ? K : never }[keyof Strings];

/** Looks up an interface string and fills {placeholders}. */
export function translate(key: TextKey, vars?: Record<string, string | number>): string {
  const s = en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}

export function chips(key: 'captionChips' | 'helpChips'): string[] {
  return en[key];
}

export type { TextKey };
