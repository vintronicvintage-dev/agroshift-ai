// Disk cache for /api/* responses. Coordinates rounded to a 0.05° grid, 7-day TTL.
import { promises as fs } from "node:fs";
import path from "node:path";

export const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
export const GRID = 0.05;

export function roundCoord(v: number): number {
  return Math.round(Math.round(v / GRID) * GRID * 100) / 100;
}

function cacheDir(): string {
  return process.env.AGROSHIFT_CACHE_DIR || path.join(process.cwd(), ".cache");
}

export function cacheKey(kind: string, lat: number, lon: number, extra = ""): string {
  return `${kind}_${roundCoord(lat).toFixed(2)}_${roundCoord(lon).toFixed(2)}${extra ? `_${extra}` : ""}.json`;
}

interface Entry<T> {
  savedAt: number;
  data: T;
}

export async function cacheGet<T>(kind: string, lat: number, lon: number, now = Date.now(), extra = ""): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(cacheDir(), cacheKey(kind, lat, lon, extra)), "utf8");
    const e = JSON.parse(raw) as Entry<T>;
    if (now - e.savedAt > CACHE_TTL_MS) return null;
    return e.data;
  } catch {
    return null;
  }
}

let tmpSeq = 0;
const inflight = new Map<string, Promise<unknown>>();

/**
 * Coalesce concurrent async work for the same key into a single in-flight Promise.
 * Once the Promise settles (resolves or rejects), the key is removed from the map.
 */
export function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

export async function cacheSet<T>(kind: string, lat: number, lon: number, data: T, extra = ""): Promise<void> {
  try {
    await fs.mkdir(cacheDir(), { recursive: true });
    const file = path.join(cacheDir(), cacheKey(kind, lat, lon, extra));
    const tmp = `${file}.${process.pid}.${++tmpSeq}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ savedAt: Date.now(), data } satisfies Entry<T>));
    await fs.rename(tmp, file);
  } catch {
    // read-only file systems (serverless): the cache is best-effort
  }
}
