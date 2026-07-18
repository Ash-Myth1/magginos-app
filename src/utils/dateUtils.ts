// src/utils/dateUtils.ts
// Shared date helpers for the 5 PM–5 AM session window.
// Used by the store, sync hooks, and order service.

/**
 * Compute the "logical day" key (YYYY-MM-DD) matching the 5 PM–5 AM session.
 * Hours 0–4 (early morning) are attributed to the *previous* calendar day.
 */
export function getLogicalDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the 5 PM–5 AM session window as { start, end } in epoch millis.
 *
 * Session definition:
 *   • If current hour is 17–23 → session started TODAY at 17:00, ends TOMORROW at 05:00
 *   • If current hour is 0–4   → session started YESTERDAY at 17:00, ends TODAY at 05:00
 *   • Otherwise (5–16)         → we're between sessions; return the *upcoming* session
 *                                 (today 17:00 → tomorrow 05:00)
 */
export function getCurrentSessionWindow(): { start: number; end: number } {
  const now = new Date();
  const h = now.getHours();

  const base = new Date(now);
  base.setSeconds(0, 0);

  if (h < 5) {
    // We're in the early-morning tail — session started YESTERDAY at 5 PM
    base.setDate(base.getDate() - 1);
  }
  // Set session start to 5 PM on the base date
  base.setHours(17, 0, 0, 0);
  const start = base.getTime();
  // Session end is 12 hours later at 5 AM
  const end = start + 12 * 60 * 60 * 1000;
  return { start, end };
}
