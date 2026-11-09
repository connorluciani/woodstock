/*
 * Local persistence for Stage 1 (Directive 22:40: demo data, no server yet).
 * Every adapter stores through this module, never through AsyncStorage directly, so the swap to the
 * Stage 1 server (docs/production_plan.md 4.1) touches one file. Keys are namespaced and versioned.
 * Owner: mobile-lead.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_PREFIX = "ws.v1.";

/* In-memory fallback when storage throws (private mode, blocked site data, tests). */
const mem = new Map<string, string>();

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const k = STORAGE_PREFIX + key;
  try {
    const raw = await AsyncStorage.getItem(k);
    if (raw == null) return mem.has(k) ? (JSON.parse(mem.get(k) as string) as T) : fallback;
    return JSON.parse(raw) as T;
  } catch {
    return mem.has(k) ? (JSON.parse(mem.get(k) as string) as T) : fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  const k = STORAGE_PREFIX + key;
  const raw = JSON.stringify(value);
  mem.set(k, raw);
  try {
    await AsyncStorage.setItem(k, raw);
  } catch {
    /* memory copy keeps the session working */
  }
}

export async function remove(key: string): Promise<void> {
  const k = STORAGE_PREFIX + key;
  mem.delete(k);
  try {
    await AsyncStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/* Deletes every Woodstock key: used by "Delete account" (Apple 5.1.1(v)) and "Reset demo". */
export async function clearAll(): Promise<void> {
  for (const k of Array.from(mem.keys())) if (k.startsWith(STORAGE_PREFIX)) mem.delete(k);
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(STORAGE_PREFIX)));
  } catch {
    /* ignore */
  }
}
