// src/hooks/useFirebaseSync.ts
// Encapsulates ALL Firebase real-time listeners.
// Call this once at the top of the app — it populates the Zustand store.

import { useEffect } from 'react';
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
  } = useStore();

  // ── 1. Public: Menu items (Firestore → store) ──────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs
            .map((d) => ({ id: Number(d.id), ...d.data() } as MenuItem))
            .sort((a, b) => a.id - b.id);
          setMenuItems(items);
        }
      },
      (err) => console.error('[Menu sync]', err)
    );
    return unsub;
  }, [setMenuItems]);

  // ── 2. Public: Inventory / out-of-stock IDs ───────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'inventory'),
      (snap) => {
        if (snap.exists()) setOutOfStockIds(snap.data().ids ?? []);
      },
      (err) => console.error('[Inventory sync]', err)
    );
    return unsub;
  }, [setOutOfStockIds]);

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
      // Small delay ensures skeleton shows briefly during cold start
      setTimeout(() => setIsLoading(false), 600);
    });
    return unsub;
  }, [patchCustomerInfo, setCurrentUser, setIsLoading]);

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
