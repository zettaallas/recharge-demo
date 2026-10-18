import * as Crypto from 'expo-crypto';
import { MAX_PIN_TRIES } from '@/data/vocab';
import type { Db, Pupil, SchoolClass } from '@/types';

// PINs and passwords are only ever stored as salted hashes.
// Prototype note: this is salted SHA-256 on the device. A 4-digit PIN is guessable offline
// whatever the hash, so real protection comes from server-side checks and rate limits once
// Supabase is added.

const toB64 = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};

export function newSalt(): string {
  return toB64(Crypto.getRandomBytes(16));
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  const h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + secret);
  return 'sha256$' + h;
}

export async function makeSecret(secret: string): Promise<{ salt: string; hash: string }> {
  const salt = newSalt();
  return { salt, hash: await hashSecret(secret, salt) };
}

/** Finds a class by code, ignoring case, spaces and the hyphen ("8bk4p" matches "8B-K4P"). */
export function findClass(db: Db, code: string): SchoolClass | undefined {
  const norm = (s: string) => s.toUpperCase().replace(/[\s-]/g, '');
  const c = norm(code);
  return db.classes.find((x) => norm(x.code) === c);
}

export type PinResult = { ok: true } | { ok: false; locked: boolean; triesLeft: number };

/** Checks a PIN and updates the pupil's failed-try count and lock in place. */
export async function checkPin(pupil: Pupil, pin: string): Promise<PinResult> {
  if (pupil.locked) return { ok: false, locked: true, triesLeft: 0 };
  if ((await hashSecret(pin, pupil.salt)) === pupil.pinHash) {
    pupil.failed = 0;
    return { ok: true };
  }
  pupil.failed += 1;
  if (pupil.failed >= MAX_PIN_TRIES) pupil.locked = true;
  return { ok: false, locked: pupil.locked, triesLeft: Math.max(0, MAX_PIN_TRIES - pupil.failed) };
}
