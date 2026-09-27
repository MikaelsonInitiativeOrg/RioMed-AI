import type { DayPart, When } from "./schema";

/** Africa/Lagos is UTC+1 all year (no DST). */
export const LAGOS_OFFSET_MINUTES = 60;

const PART_HOURS: Record<DayPart, [number, number]> = {
  morning: [7, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  any: [7, 21],
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export interface TimeWindow {
  start: Date;
  end: Date;
}

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

function lagosDate(now: Date): YMD {
  const shifted = new Date(now.getTime() + LAGOS_OFFSET_MINUTES * 60_000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

function addDays(date: YMD, days: number): YMD {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function weekday(date: YMD): number {
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
}

/** A Lagos wall-clock time as a UTC Date. */
export function lagosTime(date: YMD, hour: number, minute = 0): Date {
  return new Date(Date.UTC(date.y, date.m - 1, date.d, hour, minute) - LAGOS_OFFSET_MINUTES * 60_000);
}

function windowFor(date: YMD, part: DayPart): TimeWindow {
  const [h1, h2] = PART_HOURS[part];
  return { start: lagosTime(date, h1), end: lagosTime(date, h2) };
}

function compare(a: YMD, b: YMD): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

function clamp(w: TimeWindow, now: Date): TimeWindow | null {
  if (w.end.getTime() <= now.getTime()) return null;
  return { start: new Date(Math.max(w.start.getTime(), now.getTime())), end: w.end };
}

export function resolveWhen(when: When | null, now: Date): TimeWindow | null {
  if (!when) return null;
  const part: DayPart = PART_HOURS[when.part] ? when.part : "any";
  const today = lagosDate(now);
  const day = when.day?.toLowerCase() ?? null;

  if (day === null) {
    return clamp(windowFor(today, part), now) ?? windowFor(addDays(today, 1), part);
  }
  if (day === "today") return clamp(windowFor(today, part), now);
  if (day === "tomorrow") return windowFor(addDays(today, 1), part);

  const wd = WEEKDAYS.indexOf(day);
  if (wd >= 0) {
    const offset = (wd - weekday(today) + 7) % 7;
    const target = addDays(today, offset);
    const w = windowFor(target, part);
    // Named weekday including today: if today's window has passed, use next week.
    return offset === 0 ? clamp(w, now) ?? windowFor(addDays(today, 7), part) : w;
  }

  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const date: YMD = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    const check = new Date(Date.UTC(date.y, date.m - 1, date.d));
    if (check.getUTCFullYear() !== date.y || check.getUTCMonth() + 1 !== date.m || check.getUTCDate() !== date.d) return null;
    const cmp = compare(date, today);
    if (cmp < 0) return null;
    return cmp === 0 ? clamp(windowFor(date, part), now) : windowFor(date, part);
  }
  return null;
}
