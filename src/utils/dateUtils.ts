// src/utils/dateUtils.ts
// Shared date helpers for the 10 PM – 6 AM session window.
// Used by the store, sync hooks, and order service.

/**
 * Compute the "logical day" key (YYYY-MM-DD) matching the 10 PM–6 AM session.
 * Hours 0–5 (early morning) are attributed to the *previous* calendar day.
 */
export function getLogicalDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the 10 PM–6 AM session window as { start, end } in epoch millis.
 *
 * Session definition:
 *   • If current hour is 22–23 → session started TODAY at 22:00, ends TOMORROW at 06:00
 *   • If current hour is 0–5   → session started YESTERDAY at 22:00, ends TODAY at 06:00
 *   • Otherwise (6–21)         → we're between sessions; return the *upcoming* session
 *                                 (today 22:00 → tomorrow 06:00)
 */
export function getCurrentSessionWindow(): { start: number; end: number } {
  const now = new Date();
  const h = now.getHours();

  const base = new Date(now);
  base.setSeconds(0, 0);

  if (h < 6) {
    // We're in the early-morning tail — session started YESTERDAY at 10 PM
    base.setDate(base.getDate() - 1);
  }
  // Set session start to 10 PM on the base date
  base.setHours(22, 0, 0, 0);
  const start = base.getTime();
  // Session end is 8 hours later at 6 AM
  const end = start + 8 * 60 * 60 * 1000;
  return { start, end };
}
