// src/components/AdminDashboard.tsx
import React from 'react';
import {
  Lock, Store, Power, BarChart3, ChefHat, User, MapPin,
  ShoppingCart, Star, Clock, Check, ShieldAlert,
  IndianRupee, TrendingUp, Trophy,
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import type { Order, OrderStatus } from '../types';

// ─── Strongly-typed update payload (no any!) ──────────────────────────────
type StatusUpdatePayload = {
  status: OrderStatus;
  'timestamps.acceptedAt'?: number;
  'timestamps.readyAt'?: number;
  'timestamps.deliveredAt'?: number;
};

async function updateOrderStatus(order: Order, newStatus: OrderStatus) {
  if (!order.dbId) return;
  const now = Date.now();

  const payload: StatusUpdatePayload = { status: newStatus };
  if (newStatus === 'Cooking') payload['timestamps.acceptedAt'] = now;
  else if (newStatus === 'Out for Delivery' || newStatus === 'Ready for Pickup') payload['timestamps.readyAt'] = now;
  else if (newStatus === 'Delivered') payload['timestamps.deliveredAt'] = now;

  await updateDoc(doc(db, 'orders', order.dbId), payload as Record<string, unknown>);
}

interface AdminDashboardProps {
  onLogin: () => void;
}

export function AdminDashboard({ onLogin }: AdminDashboardProps) {
  const { currentUser, isStoreOpen, setIsStoreOpen, menuItems, outOfStockIds, orders } = useStore();

  const toggleStock = async (itemId: number) => {
    const updated = outOfStockIds.includes(itemId)
      ? outOfStockIds.filter((id) => id !== itemId)
      : [...outOfStockIds, itemId];
    await setDoc(doc(db, 'settings', 'inventory'), { ids: updated });
  };

  // ── State 1: Not logged in ───────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 sm:p-10 bg-white rounded-[2rem] shadow-xl border border-slate-100 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <Lock size={48} className="text-slate-300 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Kitchen Access</h2>
        <p className="text-sm text-slate-500 font-medium mb-8">Sign in with an authorized crew account.</p>
        <button onClick={onLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-base py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 relative z-10">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Sign in as Crew
        </button>
      </div>
    );
  }

  // ── State 2: Unauthorized ────────────────────────────────────────────────
  if (currentUser.role === 'customer') {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 sm:p-10 bg-white rounded-[2rem] shadow-xl border border-red-100 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <ShieldAlert size={48} className="text-red-400 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          The account <span className="font-bold text-slate-800">{currentUser.email}</span> does not have kitchen privileges.
        </p>
      </div>
    );
  }

  // ── State 3: Authorized crew ─────────────────────────────────────────────
  const isAdmin = currentUser.role === 'admin';
  const isChef = currentUser.role === 'chef';
  const isDelivery = currentUser.role === 'delivery';

  const completed = orders.filter((o) => o.status === 'Delivered');
  const revenue = completed.reduce((s, o) => s + o.total, 0);

  const itemCounts: Record<string, number> = {};
  completed.forEach((o) => o.items.forEach((i) => { itemCounts[i.name] = (itemCounts[i.name] ?? 0) + i.qty; }));
  const bestSeller = Object.entries(itemCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'No data yet';

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500">

      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center sm:text-left space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black flex items-center justify-center sm:justify-start gap-3 tracking-tight">
            <Store className="text-orange-400 w-8 h-8" />
            {isChef ? "Chef's Station" : isDelivery ? 'Delivery Dispatch' : 'Master Kitchen'}
          </h2>
          <p className="text-slate-400 font-medium text-sm">
            Logged in as <span className="text-orange-400 font-bold uppercase tracking-wider">{currentUser.role}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsStoreOpen(!isStoreOpen)}
            className={`relative z-10 w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
              isStoreOpen ? 'bg-green-400 text-green-950 hover:bg-green-300' : 'bg-red-500 text-white hover:bg-red-400'
            }`}
          >
            <Power size={18} className={isStoreOpen ? 'animate-pulse' : ''} />
            {isStoreOpen ? 'Store is Open' : 'Store is Closed'}
          </button>
        )}
      </div>

      {/* Analytics (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: <IndianRupee size={24} />, color: 'bg-green-100 text-green-600', label: 'Gross Revenue', value: `₹${revenue}` },
            { icon: <TrendingUp size={24} />, color: 'bg-blue-100 text-blue-600', label: 'Completed Orders', value: completed.length },
            { icon: <Trophy size={24} />, color: 'bg-yellow-100 text-yellow-600', label: 'Best Seller', value: bestSeller },
          ].map(({ icon, color, label, value }) => (
            <div key={label} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
              <div className={`${color} p-4 rounded-2xl`}>{icon}</div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">{value}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock controls */}
      {(isAdmin || isChef) && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-5">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <BarChart3 size={20} className="text-orange-500" /> Stock Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {menuItems.map((item) => {
              const isOut = outOfStockIds.includes(item.id);
              return (
                <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-bold text-sm text-slate-800 leading-tight">{item.name}</p>
                    <p className={`text-[10px] font-black mt-1 uppercase tracking-wider ${isOut ? 'text-red-500' : 'text-green-500'}`}>
                      {isOut ? 'Sold Out' : 'Active'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleStock(item.id)}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative shadow-inner ${isOut ? 'bg-red-200' : 'bg-green-500'}`}
                  >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transition-all absolute top-1 ${isOut ? 'left-1' : 'left-8'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live orders feed */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50/80 backdrop-blur-sm p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-black text-slate-800 text-lg sm:text-xl flex items-center gap-3">
            Live Orders
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
          </h2>
          <span className="bg-orange-100 text-orange-700 font-black px-4 py-1.5 rounded-xl text-sm border border-orange-200 shadow-sm">
            {orders.filter((o) => o.status !== 'Delivered').length} Active
          </span>
        </div>

        <div className="p-4 sm:p-6 grid gap-4 sm:gap-6">
          {orders.length === 0 ? (
            <div className="text-center py-16 sm:py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <ChefHat size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-bold text-lg">The kitchen is quiet.</p>
              <p className="text-sm text-slate-400 font-medium mt-1">Waiting for cravings to roll in...</p>
            </div>
          ) : (
            orders.map((order) => {
              const isActive = order.status !== 'Delivered';
              const statusBadge: Record<string, string> = {
                Received: 'bg-blue-100 text-blue-700 border-blue-200',
                Cooking: 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse',
                'Out for Delivery': 'bg-orange-100 text-orange-700 border-orange-200',
                'Ready for Pickup': 'bg-orange-100 text-orange-700 border-orange-200',
                Delivered: 'bg-green-100 text-green-700 border-green-200',
              };

              return (
                <div key={order.dbId} className={`border rounded-[2rem] p-5 sm:p-6 transition-all duration-300 ${isActive ? 'bg-white border-orange-100 shadow-lg shadow-orange-500/5' : 'bg-slate-50/50 border-slate-100 opacity-70'}`}>
                  <div className="flex justify-between items-start mb-5 sm:mb-6 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">{order.displayId}</span>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm border ${statusBadge[order.status] ?? ''}`}>
                          {order.status === 'Delivered' ? (order.orderType === 'delivery' ? 'Delivered' : 'Picked Up') : order.status}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md w-max">
                        <Clock size={12} /> Placed at {order.time}
                      </span>
                    </div>
                    <div className="text-right bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total</p>
                      <span className="font-black text-xl text-slate-900">₹{order.total}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Customer</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <p className="text-sm font-bold text-slate-700">{order.customer.name}</p>
                        <p className="text-sm font-bold text-slate-700">{order.customer.phone}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200/60">
                          {order.orderType === 'delivery'
                            ? <p className="text-sm font-black text-orange-600 flex items-center gap-2 bg-orange-50 p-2 rounded-xl"><MapPin size={16} /> Block {order.customer.block}, Room {order.customer.room}</p>
                            : <p className="text-sm font-black text-green-600 flex items-center gap-2 bg-green-50 p-2 rounded-xl"><Store size={16} /> Self Pickup</p>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14} /> Items</h4>
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex flex-col text-sm font-bold text-slate-700 bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                            <div className="flex justify-between items-center w-full">
                              <span className="flex items-center gap-3">
                                <span className="bg-slate-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black">{item.qty}x</span>
                                {item.name}
                              </span>
                              {item.rating > 0 && (
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} className={s <= item.rating ? 'fill-yellow-500 text-yellow-500' : 'text-yellow-200'} />)}
                                </div>
                              )}
                            </div>
                            {item.feedback && <p className="text-yellow-600 mt-2 text-xs italic">"{item.feedback}"</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                      {(isAdmin || isChef) && (
                        <button
                          onClick={() => updateOrderStatus(order, 'Cooking')}
                          disabled={['Cooking', 'Out for Delivery', 'Ready for Pickup'].includes(order.status)}
                          className="w-full sm:flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Start Cooking
                        </button>
                      )}
                      <button
                        onClick={() => updateOrderStatus(order, order.orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup')}
                        disabled={['Out for Delivery', 'Ready for Pickup'].includes(order.status)}
                        className="w-full sm:flex-1 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {order.orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup'}
                      </button>
                      {(isAdmin || isDelivery || (isChef && order.orderType === 'takeaway')) && (
                        <button
                          onClick={() => updateOrderStatus(order, 'Delivered')}
                          className="w-full sm:flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-green-500/30 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Check size={16} /> {order.orderType === 'delivery' ? 'Mark Delivered' : 'Mark Picked Up'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}