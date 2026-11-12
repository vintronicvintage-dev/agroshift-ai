// Polite fetch helper: timeout + retries with exponential backoff (429/5xx/network errors).
export interface FetchOpts {
  timeoutMs?: number;
  retries?: number; // additional attempts after the first
  backoffMs?: number;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { timeoutMs = 30_000, retries = 2, backoffMs = 1500, headers } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return (await res.json()) as T;
      const retryable = res.status === 429 || res.status >= 500;
      const err = new HttpError(`HTTP ${res.status} for ${url.split("?")[0]}`, res.status);
      if (!retryable) throw err;
      lastErr = err;
    } catch (e) {
      if (e instanceof HttpError && e.status && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
    }
    if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Run async tasks with a concurrency cap, preserving result order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
