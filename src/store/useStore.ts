// src/store/useStore.ts
// Single source of truth for all global state.
// Components read from this store; they do NOT pass props to each other.

import { create } from 'zustand';
import type { CartItem, CustomerInfo, CrewUser, Order, MenuItem, ItemRating } from '../types';

const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  name: '',
  phone: '',
  block: '',
  room: '',
  orderType: 'delivery',
  paymentMethod: 'upi',
};

interface AppState {
  // ─── App ─────────────────────────────────────────────────────────────────
  isLoading: boolean;
  loadingError: string | null;
  isStoreOpen: boolean;

  // ─── Data ────────────────────────────────────────────────────────────────
  menuItems: MenuItem[];
  outOfStockIds: number[];
  orders: Order[];

  // ─── Auth ────────────────────────────────────────────────────────────────
  currentUser: CrewUser | null;
  customerInfo: CustomerInfo;

  // ─── Cart & Checkout ─────────────────────────────────────────────────────
  cart: CartItem[];
  showCheckout: boolean;
  showQRModal: boolean;
  pendingOrderData: Omit<Order, 'dbId'> | null;

  // ─── Order Tracking ──────────────────────────────────────────────────────
  showMyOrders: boolean;
  activeTrackingId: string | null;
  itemRatings: Record<number, ItemRating>;

  // ─── Computed helpers ────────────────────────────────────────────────────
  cartTotal: () => number;
  cartCount: () => number;

  // ─── Actions ─────────────────────────────────────────────────────────────
  setIsLoading: (v: boolean) => void;
  setLoadingError: (v: string | null) => void;
  setIsStoreOpen: (v: boolean) => void;

  setMenuItems: (items: MenuItem[]) => void;
  setOutOfStockIds: (ids: number[]) => void;
  setOrders: (orders: Order[]) => void;

  setCurrentUser: (user: CrewUser | null) => void;
  patchCustomerInfo: (patch: Partial<CustomerInfo>) => void;
  resetCustomerInfo: () => void;

  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  setShowCheckout: (v: boolean) => void;
  setShowQRModal: (v: boolean) => void;
  setPendingOrderData: (data: Omit<Order, 'dbId'> | null) => void;

  setShowMyOrders: (v: boolean) => void;
  setActiveTrackingId: (id: string | null) => void;
  setItemRating: (itemId: number, field: keyof ItemRating, value: string | number) => void;
  clearItemRatings: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ─── Initial State ───────────────────────────────────────────────────────
  isLoading: true,
  loadingError: null,
  isStoreOpen: true,

  menuItems: [],
  outOfStockIds: [],
  orders: [],

  currentUser: null,
  customerInfo: { ...DEFAULT_CUSTOMER_INFO },

  cart: [],
  showCheckout: false,
  showQRModal: false,
  pendingOrderData: null,

  showMyOrders: false,
  activeTrackingId: null,
  itemRatings: {},

  // ─── Computed ────────────────────────────────────────────────────────────
  cartTotal: () => get().cart.reduce((sum, i) => sum + i.price * i.qty, 0),
  cartCount: () => get().cart.reduce((sum, i) => sum + i.qty, 0),

  // ─── Setters ─────────────────────────────────────────────────────────────
  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadingError: (loadingError) => set({ loadingError }),
  setIsStoreOpen: (isStoreOpen) => set({ isStoreOpen }),

  setMenuItems: (menuItems) => set({ menuItems }),
  setOutOfStockIds: (outOfStockIds) => set({ outOfStockIds }),
  setOrders: (orders) => set({ orders }),

  setCurrentUser: (currentUser) => set({ currentUser }),
  patchCustomerInfo: (patch) =>
    set((s) => ({ customerInfo: { ...s.customerInfo, ...patch } })),
  resetCustomerInfo: () => set({ customerInfo: { ...DEFAULT_CUSTOMER_INFO } }),

  // ─── Cart ────────────────────────────────────────────────────────────────
  addToCart: (item) =>
    set((s) => {
      if (!s.isStoreOpen || s.outOfStockIds.includes(item.id)) return s;
      const existing = s.cart.find((c) => c.id === item.id);
      if (existing) {
        return { cart: s.cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)) };
      }
      return { cart: [...s.cart, { ...item, qty: 1 }] };
    }),
  removeFromCart: (id) =>
    set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
  clearCart: () => set({ cart: [] }),

  setShowCheckout: (showCheckout) => set({ showCheckout }),
  setShowQRModal: (showQRModal) => set({ showQRModal }),
  setPendingOrderData: (pendingOrderData) => set({ pendingOrderData }),

  // ─── Tracking ────────────────────────────────────────────────────────────
  setShowMyOrders: (showMyOrders) => set({ showMyOrders }),
  setActiveTrackingId: (activeTrackingId) => set({ activeTrackingId }),
  setItemRating: (itemId, field, value) =>
    set((s) => ({
      itemRatings: {
        ...s.itemRatings,
        [itemId]: {
          ...(s.itemRatings[itemId] ?? { stars: 0, hover: 0, feedback: '' }),
          [field]: value,
        },
      },
    })),
  clearItemRatings: () => set({ itemRatings: {} }),
}));
