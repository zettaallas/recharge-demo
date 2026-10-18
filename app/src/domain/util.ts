import type { Band } from '@/types';

export const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const avg = (a: number[]): number | null => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

export function localISO(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
export const todayISO = () => localISO(new Date());

/** The last n weekdays before today, oldest first. */
export function lastSchoolDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() - 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) out.unshift(localISO(d));
  }
  return out;
}

/** Small seeded random generator, so the demo data is the same every time. */
export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const band = (v: number | null): Band => (v == null ? 'none' : v >= 3.5 ? 'hi' : v >= 2.5 ? 'mid' : 'lo');
