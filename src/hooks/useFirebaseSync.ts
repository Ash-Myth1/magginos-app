// src/hooks/useFirebaseSync.ts
// Encapsulates ALL Firebase real-time listeners.
// Call this once at the top of the app — it populates the Zustand store.

import { useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useStore } from '../store/useStore';
import type { Order, MenuItem } from '../types';

/**
 * Returns the 5 PM–5 AM session window as [startMs, endMs] for the current moment.
 *
 * Session definition:
 *   • If current hour is 17–23 → session started TODAY at 17:00, ends TOMORROW at 05:00
 *   • If current hour is 0–4   → session started YESTERDAY at 17:00, ends TODAY at 05:00
 *   • Otherwise (5–16)         → we're between sessions; return the *upcoming* session
 *                                 (today 17:00 → tomorrow 05:00)
 */
function getCurrentSessionWindow(): { start: number; end: number } {
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

/**
 * Compute the "logical day" key (YYYY-MM-DD) matching the 5 PM–5 AM session.
 * Hours 0–4 (early morning) are attributed to the *previous* calendar day.
 */
function getLogicalDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useFirebaseSync() {
  const {
    currentUser,
    setCurrentUser,
    patchCustomerInfo,
    setMenuItems,
    setOutOfStockIds,
    setOrders,
    setLoadingError,
    setIsLoading,
    setForceInStockIds,
    setActualPrepCountsSync,
    setSoldCountsSync,
  } = useStore();

  // Track readiness of both auth and menu so we only hide the skeleton
  // once BOTH have resolved at least once.
  const menuReady = useRef(false);
  const authReady = useRef(false);

  const tryFinishLoading = useCallback(() => {
    if (menuReady.current && authReady.current) {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  // ── 1. Public: Menu items (Firestore → store) ──────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: Number(d.id), ...d.data() } as MenuItem))
          .sort((a, b) => a.id - b.id);
        setMenuItems(items);

        // Mark menu as ready even if collection is empty
        if (!menuReady.current) {
          menuReady.current = true;
          tryFinishLoading();
        }
      },
      (err) => {
        console.error('[Menu sync]', err);
        // Even on error, mark as ready so the UI doesn't stay stuck
        if (!menuReady.current) {
          menuReady.current = true;
          tryFinishLoading();
        }
      }
    );
    return unsub;
  }, [setMenuItems, tryFinishLoading]);

  // ── 2. Public: Inventory / out-of-stock IDs ───────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'inventory'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOutOfStockIds(data.ids ?? []);
          setForceInStockIds(data.forceInStockIds ?? []);
          setActualPrepCountsSync(data.prepCounts ?? {});
        } else {
          setOutOfStockIds([]);
          setForceInStockIds([]);
          setActualPrepCountsSync({});
        }
      },
      (err) => console.error('[Inventory sync]', err)
    );
    return unsub;
  }, [setOutOfStockIds, setForceInStockIds, setActualPrepCountsSync]);

  // ── 3. Auth state → user profile + role lookup ─────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Restore saved delivery info from localStorage
        const uid = firebaseUser.uid;
        patchCustomerInfo({
          name: firebaseUser.displayName ?? '',
          phone: localStorage.getItem(`phone_${uid}`) ?? '',
          block: localStorage.getItem(`block_${uid}`) ?? '',
          room: localStorage.getItem(`room_${uid}`) ?? '',
        });

        // Role lookup from 'crew' collection
        try {
          const crewSnap = await getDoc(doc(db, 'crew', firebaseUser.email!));
          setCurrentUser({
            uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: crewSnap.exists() ? crewSnap.data().role : 'customer',
          });
        } catch {
          setCurrentUser({
            uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: 'customer',
          });
        }
      } else {
        setCurrentUser(null);
      }

      // Mark auth as resolved
      if (!authReady.current) {
        authReady.current = true;
        // Small delay ensures skeleton shows briefly during cold start
        setTimeout(() => tryFinishLoading(), 600);
      }
    });
    return unsub;
  }, [patchCustomerInfo, setCurrentUser, tryFinishLoading]);

  // ── 4. Secure: Orders (scoped to role) ────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setLoadingError(null);
      // Clear sold counts when logged out
      setSoldCountsSync({});
      return;
    }

    // Customers only see their own orders; crew sees all
    const q =
      currentUser.role === 'customer'
        ? query(collection(db, 'orders'), where('customer.uid', '==', currentUser.uid))
        : query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs
          .map((d) => ({ dbId: d.id, ...d.data() } as Order))
          .sort((a, b) => b.timestamp - a.timestamp); // local sort avoids composite index for customers

        setOrders(fetched);
        setLoadingError(null);

        // ── Compute sold counts for tonight's session ──────────────────
        // We derive this client-side from the live orders feed so no
        // extra Firestore collection is needed.
        const { start, end } = getCurrentSessionWindow();
        const todayKey = getLogicalDayKey();

        const soldToday: Record<string, number> = {};
        for (const order of fetched) {
          if (order.timestamp >= start && order.timestamp < end) {
            for (const item of order.items) {
              soldToday[item.name] = (soldToday[item.name] ?? 0) + item.qty;
            }
          }
        }
        setSoldCountsSync({ [todayKey]: soldToday });
      },
      (err) => {
        console.error('[Orders sync]', err);
        setLoadingError('Failed to connect to the kitchen. Please refresh.');
      }
    );

    return unsub;
  }, [currentUser, setOrders, setLoadingError, setSoldCountsSync]);
}
