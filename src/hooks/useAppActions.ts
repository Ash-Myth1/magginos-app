// src/hooks/useAppActions.ts
// Exported here (not from App.tsx) to satisfy react-refresh/only-export-components.
// App.tsx is for components only.

import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '../firebase';
import { useStore } from '../store/useStore';
import { OrderService } from '../services/orderService';
import type { Order } from '../types';

export function useAuthActions() {
  const { resetCustomerInfo, setActiveTrackingId, setShowMyOrders } = useStore();

  const login = () => signInWithPopup(auth, provider).catch(console.error);

  const logout = async () => {
    await signOut(auth);
    resetCustomerInfo();
    setActiveTrackingId(null);
    setShowMyOrders(false);
  };

  return { login, logout };
}

export function useOrderActions() {
  const { clearCart, setShowQRModal, setShowCheckout, setActiveTrackingId, setPendingOrderData } = useStore();

  const submitOrder = async (orderData: Omit<Order, 'dbId'>) => {
    try {
      const newId = await OrderService.placeOrder(orderData);
      clearCart();
      setShowQRModal(false);
      setShowCheckout(false);
      setActiveTrackingId(newId);
      setPendingOrderData(null);
    } catch {
      alert('Database sync failed — please try again.');
    }
  };

  return { submitOrder };
}
