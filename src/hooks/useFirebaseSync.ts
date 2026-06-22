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
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useStore } from '../store/useStore';
import type { Order, MenuItem } from '../types';

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
          useStore.getState().setSoldCountsSync(data.soldCounts ?? {});
        } else {
          setOutOfStockIds([]);
          setForceInStockIds([]);
          setActualPrepCountsSync({});
          useStore.getState().setSoldCountsSync({});
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
      return;
    }

    // Customers only see their own orders; crew sees all
    const q =
      currentUser.role === 'customer'
        ? query(collection(db, 'orders'), where('customer.uid', '==', currentUser.uid))
        : query(collection(db, 'orders'), orderBy('timestamp', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs
          .map((d) => ({ dbId: d.id, ...d.data() } as Order))
          .sort((a, b) => b.timestamp - a.timestamp); // local sort avoids composite index for customers
        setOrders(fetched);
        setLoadingError(null);
      },
      (err) => {
        console.error('[Orders sync]', err);
        setLoadingError('Failed to connect to the kitchen. Please refresh.');
      }
    );

    return unsub;
  }, [currentUser, setOrders, setLoadingError]);
}
