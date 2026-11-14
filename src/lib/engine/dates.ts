/** Date helpers on UTC "epoch days" (days since 1970-01-01). Pure, browser-safe. */

const MS_PER_DAY = 86_400_000;

export function toEpochDay(date: string): number {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function epochDayOf(y: number, m: number, d: number): number {
  const yr = m <= 2 ? y - 1 : y;
  const era = Math.floor(yr / 400);
  const yoe = yr - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromEpochDay(day: number): string {
  const dt = new Date(day * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  return `${y}-${m < 10 ? "0" : ""}${m}-${d < 10 ? "0" : ""}${d}`;
}

export function ymdOfEpochDay(day: number): { y: number; m: number; d: number } {
  const dt = new Date(day * MS_PER_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function parseMonthDay(md: string): { m: number; d: number } {
  return { m: Number(md.slice(0, 2)), d: Number(md.slice(3, 5)) };
}

/** "MM-DD" of an epoch day. */
export function monthDayOf(day: number): string {
  return fromEpochDay(day).slice(5);
}
