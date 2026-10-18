// Drift alert: a pupil's average battery has fallen across 3 or more check-ins.
export function driftInfo(avgs: (number | null)[]): { drops: number; from: number; to: number } | null {
  const a = avgs.filter((v): v is number => v != null);
  if (a.length < 5) return null;
  // smooth each check-in with the one before, so one partial check-in can't hide a slide
  const sm = a.slice(1).map((v, i) => (v + a[i]) / 2);
  let drops = 0;
  let start = sm.length - 1;
  for (let i = sm.length - 1; i > 0; i--) {
    const diff = sm[i] - sm[i - 1];
    if (diff < -0.05) {
      drops++;
      start = i - 1;
    } else if (Math.abs(diff) <= 0.1) {
      start = i - 1;
    } else break;
  }
  if (drops < 3) return null;
  const from = a[start];
  const to = a[a.length - 1];
  if (from - to < 0.6) return null;
  return { drops, from, to };
}
