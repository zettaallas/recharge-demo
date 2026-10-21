// PIN hashing and lockout, used by the Edge Functions. Only WebCrypto, so the same file runs in
// Supabase Edge Functions (Deno) and in Node for local tests.
//
// PBKDF2-SHA256, a random 16-byte salt per pupil, 600,000 iterations (OWASP 2023 guidance for PBKDF2-SHA256).
// Stored as  pbkdf2$<iterations>$<base64 hash>  so the iteration count can be raised later without breaking old PINs.

export const ITERATIONS = 600_000;
export const MAX_TRIES = 5;

const enc = new TextEncoder();
const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPin(pin: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations }, key, 256);
  return `pbkdf2$${iterations}$${toB64(bits)}`;
}

/** Constant-time comparison, so timing doesn't reveal how much of a hash matched. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPin(pin: string, salt: string, stored: string): Promise<boolean> {
  const m = /^pbkdf2\$(\d+)\$/.exec(stored);
  if (!m) return false; // unknown format: never accept
  return sameString(await hashPin(pin, salt, Number(m[1])), stored);
}

/** A random 4-digit PIN, without bias (rejects values that would skew the spread). */
export function randomPin(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 10000) * 10000;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return String(buf[0] % 10000).padStart(4, '0');
}

export interface SecretState {
  failed: number;
  locked: boolean;
}

/** The lockout rule: a right PIN resets the count; 5 wrong PINs lock the account until a teacher resets it. */
export function afterAttempt(state: SecretState, correct: boolean): SecretState & { ok: boolean } {
  if (state.locked) return { ...state, ok: false };
  if (correct) return { failed: 0, locked: false, ok: true };
  const failed = state.failed + 1;
  return { failed, locked: failed >= MAX_TRIES, ok: false };
}
