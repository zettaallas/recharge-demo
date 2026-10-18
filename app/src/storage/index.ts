import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSeed } from '@/data/seed';
import type { Db } from '@/types';

/**
 * Where the app keeps its data. Screens only talk to this interface,
 * so a Supabase store can replace the local one later without screen changes.
 */
export interface Store {
  load(): Promise<Db | null>;
  save(db: Db): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'recharge.db.v2';

/** On-device only. Nothing leaves the phone or browser. */
export const localStore: Store = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Db) : null;
    } catch {
      return null;
    }
  },
  async save(db) {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  },
  async clear() {
    await AsyncStorage.removeItem(KEY);
  },
};

/** Loads saved data, or builds and saves the fictional demo data on first run. */
export async function loadOrSeed(store: Store = localStore): Promise<Db> {
  const saved = await store.load();
  if (saved && saved.version === 2) return saved;
  const db = await buildSeed();
  await store.save(db);
  return db;
}

/** Wipes local data and starts again from the demo seed. */
export async function resetDemo(store: Store = localStore): Promise<Db> {
  await store.clear();
  return loadOrSeed(store);
}
