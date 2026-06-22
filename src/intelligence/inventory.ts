// src/intelligence/inventory.ts
// ─────────────────────────────────────────────────────────────────────────────
// Inventory Forecasting Engine for Maggino's — a late-night restaurant
// operating from 5 PM to 5 AM (full 12-hour session).
//
// This module produces actionable inventory insights from order history:
//   • Daily sales forecasts per menu item
//   • Fast-moving / slow-moving detection
//   • Stockout-hour predictions with confidence levels
//   • Wastage risk scores (0-100)
//   • Hourly demand heatmaps (24-element arrays per item)
//   • Built-in synthetic data generator for demo / low-data situations
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Order,
  OrderItem,
  MenuItem,
  CustomerInfo,
  OrderStatus,
} from '../types';

// ─── Exported Interfaces ─────────────────────────────────────────────────────

/** Forecast for a single menu item on the current operating day. */
export interface DailyForecastItem {
  /** Menu item name. */
  itemName: string;
  /** Units actually sold so far today. */
  soldToday: number;
  /** Projected total units by end of today's operating window (5 AM). */
  projectedTotal: number;
  /** Historical average daily units (from real or demo data). */
  avgDaily: number;
}

/** An item with high sales velocity. */
export interface FastMovingItem {
  name: string;
  qty: number;
  /** 'hot' = top 20% by volume; 'rising' = today's sales exceed its daily avg. */
  velocity: 'hot' | 'rising';
}

/** An item with low sales velocity. */
export interface SlowMovingItem {
  name: string;
  qty: number;
  /** Calendar days since this item last appeared in an order, or null if never ordered. */
  daysSinceLastOrder: number | null;
}

/** Alert predicting WHICH HOUR an item will likely run out. */
export interface StockoutAlert {
  itemName: string;
  /** Human-readable hour range, e.g. "12 AM - 1 AM". */
  predictedHour: string;
  confidence: 'high' | 'medium' | 'low';
}

/** Wastage risk assessment for a prepped item. */
export interface WastageAlert {
  itemName: string;
  /** 0 = no risk, 100 = almost certainly wasted. */
  riskScore: number;
  /** Short human-readable explanation. */
  reason: string;
}

/** Recommended prep amounts for the upcoming/current shift. */
export interface PrepRecommendation {
  itemName: string;
  /** Expected average sales for today (adjusted for day-of-week). */
  expectedSales: number;
  /** Recommended amount to prep (typically 1.3x expected sales). */
  recommendedQty: number;
  /** How many units have already been sold today. */
  soldToday: number;
}

/** Top-level container returned by the engine. */
export interface InventoryInsights {
  prepRecommendations: PrepRecommendation[];
  dailyForecast: DailyForecastItem[];
  fastMoving: FastMovingItem[];
  slowMoving: SlowMovingItem[];
  stockoutAlerts: StockoutAlert[];
  wastageAlerts: WastageAlert[];
  /** itemName → 24-element array (index 0 = midnight hour, 23 = 11 PM hour). */
  hourlyDemand: Record<string, number[]>;
  /** True when the engine fell back to synthetic demo data. */
  isUsingDemoData: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Operating hours for the full 5 PM–5 AM session, expressed as an ordered
 * sequence that spans two calendar days.
 * Index 0 is the session start (17 = 5 PM), last is 4 (4 AM–5 AM).
 */
const OPERATING_HOURS: readonly number[] = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4] as const;

/** Total length of a single operating window in hours. */
const WINDOW_LENGTH = OPERATING_HOURS.length; // 12 hours

/** Minimum real orders required before we trust real data over demo data. */
const MIN_REAL_ORDERS = 10;

/** How many synthetic orders the demo generator creates. */
const DEMO_ORDER_COUNT = 50;

/** Number of simulated historical days for demo data. */
const DEMO_DAY_SPAN = 4;

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/**
 * Format a 24-hour integer to a human-readable label.
 * @example formatHour(0) → "12 AM", formatHour(13) → "1 PM"
 */
function formatHour(h: number): string {
  const normalised = ((h % 24) + 24) % 24;
  const suffix = normalised >= 12 ? 'PM' : 'AM';
  const display = normalised % 12 || 12;
  return `${display} ${suffix}`;
}

/**
 * Format a hour-range string for stockout alerts.
 * @example formatHourRange(0) → "12 AM - 1 AM"
 */
function formatHourRange(h: number): string {
  return `${formatHour(h)} - ${formatHour(h + 1)}`;
}

/**
 * Return the calendar-date string (YYYY-MM-DD) in the restaurant's "logical
 * day" perspective using the 5 PM–5 AM session definition.
 *
 * Hours 0–4 (early morning, still in the night session) are mapped back to
 * the *previous* calendar day so they group with the 5 PM session start.
 * Hours 17–23 already belong to the current calendar day.
 */
function logicalDay(timestamp: number): string {
  const d = new Date(timestamp);
  // If the real hour is 0–4 (after midnight but still in the window),
  // subtract one calendar day so it groups with the 5 PM start.
  if (d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get the hour-of-day (0-23) from a timestamp. */
function hourOf(timestamp: number): number {
  return new Date(timestamp).getHours();
}

/**
 * How far (0.0 – 1.0) into the current operating window (5 PM–5 AM) we are.
 * Returns 0 when outside the operating window (i.e. between 5 AM and 5 PM).
 * Returns 1.0 at the very end (5 AM).
 */
function windowProgress(): number {
  const now = new Date();
  const h = now.getHours();
  const minuteFraction = now.getMinutes() / 60;

  // Map each operating hour to its ordinal position (0-based).
  const idx = OPERATING_HOURS.indexOf(h);
  if (idx === -1) return 0; // outside operating hours — treat as 0
  return Math.min(1, (idx + minuteFraction) / WINDOW_LENGTH);
}

/** Today's "logical day" key. */
function todayKey(): string {
  return logicalDay(Date.now());
}

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Lets the demo generator produce stable results for the same seed.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Demo Data Generator ─────────────────────────────────────────────────────

/**
 * Create ~50 realistic synthetic orders spread across 3–5 nights within the
 * 5 PM – 5 AM window.
 *
 * Realism levers:
 * - Popularity follows a power-law: a few items dominate.
 * - Peak demand is around midnight–1 AM.
 * - Order sizes vary (1–4 items).
 *
 * @param menuItems Full menu; item names + prices are used.
 * @returns Array of synthetic Order objects.
 */
export function generateDemoOrders(menuItems: MenuItem[]): Order[] {
  if (menuItems.length === 0) return [];

  const rng = seededRandom(42);
  const orders: Order[] = [];

  // Assign a popularity weight to each menu item (power-law skew).
  const weights = menuItems.map((_, i) => Math.pow(0.55, i) + 0.05);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const cumulativeWeights = weights.map(
    (
      (sum) => (w: number) =>
        (sum += w / totalWeight)
    )(0)
  );

  /** Pick a random menu item respecting popularity weights. */
  const pickItem = (): MenuItem => {
    const r = rng();
    for (let i = 0; i < cumulativeWeights.length; i++) {
      if (r <= cumulativeWeights[i]) return menuItems[i];
    }
    return menuItems[menuItems.length - 1];
  };

  // Spread orders across DEMO_DAY_SPAN nights ending with "last night".
  const baseDate = new Date();
  // Start from (DEMO_DAY_SPAN - 1) days ago.
  baseDate.setDate(baseDate.getDate() - (DEMO_DAY_SPAN - 1));
  baseDate.setHours(17, 0, 0, 0); // Session starts at 5 PM

  for (let ordIdx = 0; ordIdx < DEMO_ORDER_COUNT; ordIdx++) {
    // Pick a random night (0 .. DEMO_DAY_SPAN-1).
    const nightOffset = Math.floor(rng() * DEMO_DAY_SPAN);

    // Pick an hour within the window, biased toward midnight–1 AM.
    // We sample from a triangular-ish distribution peaking at midnight.
    const hourBias = (): number => {
      const u = rng();
      // Distribution across the 12-hour window (17 PM → 5 AM)
      if (u < 0.05) return 17; // early evening — lightest traffic
      if (u < 0.10) return 18;
      if (u < 0.16) return 19;
      if (u < 0.23) return 20;
      if (u < 0.32) return 21;
      if (u < 0.45) return 22;
      if (u < 0.60) return 23; // ramp up as the night gets going
      if (u < 0.72) return 0;  // midnight peak
      if (u < 0.82) return 1;
      if (u < 0.89) return 2;
      if (u < 0.95) return 3;
      return 4; // tail end
    };
    const hour = hourBias();
    const minute = Math.floor(rng() * 60);

    const orderDate = new Date(baseDate);
    orderDate.setDate(baseDate.getDate() + nightOffset);
    // Handle wrap: hours 0-4 are technically the *next* calendar day.
    if (hour < 5) {
      orderDate.setDate(orderDate.getDate() + 1);
    }
    orderDate.setHours(hour, minute, Math.floor(rng() * 60), 0);
    const ts = orderDate.getTime();

    // Build 1–4 items per order.
    const itemCount = 1 + Math.floor(rng() * 3.5);
    const chosenSet = new Map<number, OrderItem>();
    for (let i = 0; i < itemCount; i++) {
      const mi = pickItem();
      if (chosenSet.has(mi.id)) {
        // Increase quantity.
        chosenSet.get(mi.id)!.qty += 1;
      } else {
        chosenSet.set(mi.id, {
          id: mi.id,
          name: mi.name,
          qty: 1,
          price: mi.price,
          rating: 0,
          feedback: '',
        });
      }
    }
    const items = Array.from(chosenSet.values());
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const deliveryFee = rng() > 0.4 ? 20 : 0;
    const total = subtotal + deliveryFee;

    const order: Order = {
      dbId: `demo-${ordIdx}`,
      displayId: `D${String(ordIdx + 1).padStart(3, '0')}`,
      items,
      total,
      subtotal,
      deliveryFee,
      orderType: deliveryFee > 0 ? 'delivery' : 'takeaway',
      paymentMethod: rng() > 0.5 ? 'upi' : 'cod',
      customer: {
        name: `Demo Customer ${ordIdx + 1}`,
        phone: '9999900000',
        block: 'A',
        room: '101',
        orderType: deliveryFee > 0 ? 'delivery' : 'takeaway',
        paymentMethod: rng() > 0.5 ? 'upi' : 'cod',
      } as CustomerInfo,
      status: 'Delivered' as OrderStatus,
      time: orderDate.toLocaleString(),
      timestamp: ts,
    };

    orders.push(order);
  }

  return orders;
}

// ─── Core Analytics Engine ───────────────────────────────────────────────────

/**
 * Produce a complete set of inventory insights from order history and the menu.
 *
 * When fewer than {@link MIN_REAL_ORDERS} real orders are available the engine
 * automatically mixes in synthetic demo data so every widget has something
 * useful to display.
 *
 * @param orders  All orders (may be empty / small).
 * @param menuItems Full menu for the restaurant.
 * @returns {@link InventoryInsights}
 */
export function generateInventoryInsights(
  orders: Order[],
  menuItems: MenuItem[],
  actualPrepCounts: Record<string, number> = {},
  isDemoMode?: boolean
): InventoryInsights {
  // ── Fallback to demo data when real data is too sparse ───────────────
  const isUsingDemoData = isDemoMode !== undefined ? isDemoMode : orders.length < MIN_REAL_ORDERS;
  const effectiveOrders: Order[] = isUsingDemoData
    ? [...orders, ...generateDemoOrders(menuItems)]
    : orders;

  // ── Pre-compute lookup structures ────────────────────────────────────
  const menuNames = menuItems.map((m) => m.name);
  const today = todayKey();
  const now = Date.now();

  /**
   * Per-item aggregations we'll build in a single pass.
   */
  interface ItemAccum {
    totalQty: number;
    todayQty: number;
    /** Set of logical-day keys this item appeared in. */
    daysSeen: Set<string>;
    /** Most recent timestamp this item was ordered. */
    lastSeenTs: number;
    /** hourly buckets (24 elements). */
    hourly: number[];
  }

  const accum: Record<string, ItemAccum> = {};
  /** Ensure every menu item has an entry even if never ordered. */
  for (const name of menuNames) {
    accum[name] = {
      totalQty: 0,
      todayQty: 0,
      daysSeen: new Set(),
      lastSeenTs: 0,
      hourly: new Array(24).fill(0),
    };
  }

  // Set of all logical days present in the data (for averaging).
  const allDays = new Set<string>();

  // ── Single-pass aggregation ──────────────────────────────────────────
  for (const order of effectiveOrders) {
    const day = logicalDay(order.timestamp);
    const hour = hourOf(order.timestamp);
    allDays.add(day);

    for (const item of order.items) {
      let a = accum[item.name];
      if (!a) {
        // Item exists in orders but wasn't in the menu list — create ad-hoc.
        a = {
          totalQty: 0,
          todayQty: 0,
          daysSeen: new Set(),
          lastSeenTs: 0,
          hourly: new Array(24).fill(0),
        };
        accum[item.name] = a;
      }

      a.totalQty += item.qty;
      a.hourly[hour] += item.qty;
      a.daysSeen.add(day);
      if (order.timestamp > a.lastSeenTs) a.lastSeenTs = order.timestamp;

      if (day === today) {
        a.todayQty += item.qty;
      }
    }
  }

  const totalDays = Math.max(1, allDays.size);

  /**
   * windowProgress() returns 0 when we're outside operating hours (5 AM – 5 PM).
   * In that case we use the expected daily average as the projection instead of
   * extrapolating from zero sales — avoiding the 100× inflation bug.
   */
  const rawProgress = windowProgress();
  const isInsideWindow = rawProgress > 0;
  // Use a tiny floor only for the division guard when we ARE inside the window.
  const progress = isInsideWindow ? Math.max(rawProgress, 0.01) : 1;

  // ── Day-of-Week Seasonality Multiplier ───────────────────────────────
  const uniqueDays = Array.from(allDays);
  const dailyVolume: Record<string, number> = {};
  for (const order of effectiveOrders) {
    const day = logicalDay(order.timestamp);
    const orderVol = order.items.reduce((sum, item) => sum + item.qty, 0);
    dailyVolume[day] = (dailyVolume[day] || 0) + orderVol;
  }

  const dowTotals = new Array(7).fill(0);
  const dowCounts = new Array(7).fill(0);
  for (const dayStr of uniqueDays) {
    // Parse at 12:00 PM UTC to avoid timezone shifting the day backward/forward
    const d = new Date(`${dayStr}T12:00:00Z`);
    const dow = d.getUTCDay();
    dowCounts[dow]++;
    dowTotals[dow] += dailyVolume[dayStr] || 0;
  }

  const overallAvgVolume = uniqueDays.length > 0
    ? Object.values(dailyVolume).reduce((a, b) => a + b, 0) / uniqueDays.length
    : 1;

  const todayDate = new Date(`${today}T12:00:00Z`);
  const todayDow = todayDate.getUTCDay();
  const todayDowAvg = dowCounts[todayDow] > 0 ? dowTotals[todayDow] / dowCounts[todayDow] : overallAvgVolume;

  // Multiplier for today (capped between 0.5 and 2.0 to prevent extreme skews on sparse data)
  let dowMultiplier = overallAvgVolume > 0 ? todayDowAvg / overallAvgVolume : 1;
  dowMultiplier = Math.max(0.5, Math.min(dowMultiplier, 2.0));

  // ── 1. Daily Forecast ────────────────────────────────────────────────
  const dailyForecast: DailyForecastItem[] = Object.entries(accum).map(
    ([itemName, a]) => {
      const avgDaily = a.totalQty / totalDays;
      const expectedToday = avgDaily * dowMultiplier;

      let projectedTotal: number;
      if (!isInsideWindow) {
        // Outside operating hours (5 AM–5 PM): show the expected forecast for
        // tonight — not an extrapolation from today's (non-existent) sales.
        projectedTotal = expectedToday;
      } else if (a.todayQty > 0) {
        // Inside the window with real sales: extrapolate from current pace.
        projectedTotal = Math.round((a.todayQty / progress) * 10) / 10;
      } else {
        // Inside the window but no sales yet: fall back to historical expectation.
        projectedTotal = expectedToday;
      }

      return {
        itemName,
        soldToday: a.todayQty,
        projectedTotal: Math.round(projectedTotal * 10) / 10,
        avgDaily: Math.round(avgDaily * 10) / 10,
      };
    }
  );

  // ── 2. Prep Recommendations ──────────────────────────────────────────
  const prepRecommendations: PrepRecommendation[] = Object.entries(accum)
    .map(([itemName, a]) => {
      const historicalAvgDaily = a.totalQty / totalDays;
      const expectedToday = historicalAvgDaily * dowMultiplier;
      const recommendedQty = Math.ceil(expectedToday * 1.3);

      return {
        itemName,
        expectedSales: Math.round(expectedToday * 10) / 10,
        recommendedQty,
        soldToday: a.todayQty,
      };
    })
    .filter(item => item.recommendedQty > 0)
    .sort((a, b) => b.recommendedQty - a.recommendedQty);

  // Sort forecast descending by soldToday for readability.
  dailyForecast.sort((a, b) => b.soldToday - a.soldToday);

  // ── 3. Fast-Moving Detection ─────────────────────────────────────────
  const sortedByQty = Object.entries(accum)
    .map(([name, a]) => ({ name, qty: a.todayQty, avg: a.totalQty / totalDays }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  const hotCutoff = Math.max(1, Math.ceil(sortedByQty.length * 0.2));
  const fastMoving: FastMovingItem[] = [];

  for (let i = 0; i < sortedByQty.length; i++) {
    const item = sortedByQty[i];
    if (i < hotCutoff) {
      fastMoving.push({ name: item.name, qty: item.qty, velocity: 'hot' });
    } else if (item.qty > item.avg) {
      fastMoving.push({ name: item.name, qty: item.qty, velocity: 'rising' });
    }
  }

  // ── 4. Slow-Moving Detection ─────────────────────────────────────────
  const slowCandidates = Object.entries(accum)
    .map(([name, a]) => {
      let daysSinceLastOrder: number | null = null;
      if (a.lastSeenTs > 0) {
        daysSinceLastOrder = Math.floor(
          (now - a.lastSeenTs) / (1000 * 60 * 60 * 24)
        );
      }
      return { name, qty: a.todayQty, daysSinceLastOrder, totalQty: a.totalQty };
    })
    .sort((a, b) => a.totalQty - b.totalQty);

  // Bottom 30 % or at least 1 item, but never more than half the menu.
  const slowCount = Math.min(
    Math.max(1, Math.ceil(slowCandidates.length * 0.3)),
    Math.floor(slowCandidates.length / 2) || 1
  );
  const slowMoving: SlowMovingItem[] = slowCandidates
    .slice(0, slowCount)
    .map((c) => ({
      name: c.name,
      qty: c.qty,
      daysSinceLastOrder: c.daysSinceLastOrder,
    }));

  // ── 5. Stockout Prediction ───────────────────────────────────────────
  const stockoutAlerts: StockoutAlert[] = [];

  // Only run stockout alerts when we're inside the operating window
  if (isInsideWindow) {
    for (const [itemName, a] of Object.entries(accum)) {
      if (a.todayQty === 0) continue; // no sales today — nothing to predict

      // Build an average hourly demand curve from all data for this item.
      const avgHourly = a.hourly.map((h) => h / totalDays);

      // Cumulative demand from now until end of window.
      const currentHour = new Date().getHours();
      let remainingDemand = 0;

      // Walk the remaining operating hours and sum expected demand.
      const currentIdx = OPERATING_HOURS.indexOf(currentHour);
      if (currentIdx === -1) continue; // outside window

      for (let oi = currentIdx + 1; oi < OPERATING_HOURS.length; oi++) {
        remainingDemand += avgHourly[OPERATING_HOURS[oi]];
      }

      // Simple heuristic: if today's velocity is significantly above average,
      // find the hour where cumulative exceeds a "typical prep" threshold.
      // We define "typical prep" as 1.3× the average daily total adjusted by DOW multiplier.
      // If the user manually provided an actual prep count, we use that instead!
      const heuristicPrep = (a.totalQty / totalDays) * dowMultiplier * 1.3;
      const typicalPrep = actualPrepCounts[itemName] !== undefined ? actualPrepCounts[itemName] : heuristicPrep;

      if (typicalPrep <= 0) continue;

      let cumulativeToday = a.todayQty;
      let predictedHour: number | null = null;

      for (let oi = currentIdx + 1; oi < OPERATING_HOURS.length; oi++) {
        cumulativeToday += avgHourly[OPERATING_HOURS[oi]];
        if (cumulativeToday >= typicalPrep) {
          predictedHour = OPERATING_HOURS[oi];
          break;
        }
      }

      if (predictedHour !== null) {
        // Confidence depends on how much today's pace exceeds average.
        const paceRatio = a.todayQty / Math.max(0.1, (a.totalQty / totalDays) * progress);
        let confidence: 'high' | 'medium' | 'low';
        if (paceRatio > 1.8) confidence = 'high';
        else if (paceRatio > 1.2) confidence = 'medium';
        else confidence = 'low';

        stockoutAlerts.push({
          itemName,
          predictedHour: formatHourRange(predictedHour),
          confidence,
        });
      }
    }
  }

  // Sort stockout alerts: high confidence first.
  const confOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  stockoutAlerts.sort(
    (a, b) => confOrder[a.confidence] - confOrder[b.confidence]
  );

  // ── 6. Wastage Prediction ────────────────────────────────────────────
  const wastageAlerts: WastageAlert[] = [];

  for (const [itemName, a] of Object.entries(accum)) {
    const historicalAvgDaily = a.totalQty / totalDays;
    const expectedToday = historicalAvgDaily * dowMultiplier;
    const manualPrep = actualPrepCounts[itemName];
    const typicalPrep = manualPrep !== undefined ? manualPrep : Math.ceil(expectedToday * 1.3);

    // If nothing was prepped, or if we've already sold everything prepped, there's no wastage risk!
    if (typicalPrep <= 0 || a.todayQty >= typicalPrep) continue;

    // Only calculate wastage risk when inside the operating window
    const effectiveProgress = isInsideWindow ? progress : 0;

    let riskScore = 0;
    const reasons: string[] = [];

    const overPrepRatio = expectedToday > 0 ? typicalPrep / expectedToday : typicalPrep;

    // Factor 1: Massive over-preparation compared to historical demand
    if (overPrepRatio > 2 && typicalPrep > a.todayQty + 1) {
      if (overPrepRatio > 4) {
        riskScore += 60;
        reasons.push(`Prepped ${typicalPrep} items but historical demand is ~${Math.max(1, Math.round(expectedToday))}`);
      } else {
        riskScore += 35;
        reasons.push(`Prepped significantly more than usual demand (~${Math.max(1, Math.round(expectedToday))})`);
      }
    }

    // Factor 2: Zero sales despite significant time passed
    if (a.todayQty === 0 && typicalPrep > 0) {
      if (effectiveProgress > 0.3) {
        riskScore += 30;
        reasons.push('No sales today despite prepped inventory');
      } else if (effectiveProgress > 0) {
        riskScore += 10;
        reasons.push('No sales yet');
      }
    }

    // Factor 3: Sluggish sales pace (only meaningful inside the window)
    if (isInsideWindow && a.todayQty > 0 && a.todayQty < typicalPrep * 0.4 * effectiveProgress) {
      riskScore += 30;
      reasons.push(`Sales pace (${a.todayQty}) is too slow to clear prep (${typicalPrep})`);
    }

    // Factor 4: End-of-window panic (only inside window)
    if (isInsideWindow && effectiveProgress > 0.6) {
      const remaining = typicalPrep - a.todayQty;
      if (remaining > Math.max(2, expectedToday * 0.4)) {
        riskScore += 40;
        reasons.push(`Window >60% done with ${remaining} items still left`);
      }
    }

    // Factor 5: Never ordered ever
    if (a.totalQty === 0) {
      riskScore += 20;
      if (!reasons.some(r => r.includes('historical demand'))) {
         reasons.push('Item has never been ordered before');
      }
    }

    riskScore = Math.min(100, riskScore);

    if (riskScore > 0) {
      wastageAlerts.push({
        itemName,
        riskScore,
        reason: reasons.join('; '),
      });
    }
  }

  // Sort by riskScore descending.
  wastageAlerts.sort((a, b) => b.riskScore - a.riskScore);

  // ── 7. Hourly Demand Heatmap ─────────────────────────────────────────
  const hourlyDemand: Record<string, number[]> = {};
  for (const [itemName, a] of Object.entries(accum)) {
    hourlyDemand[itemName] = [...a.hourly];
  }

  // ── Assemble & return ────────────────────────────────────────────────
  return {
    prepRecommendations,
    dailyForecast,
    fastMoving,
    slowMoving,
    stockoutAlerts,
    wastageAlerts,
    hourlyDemand,
    isUsingDemoData,
  };
}
