// src/components/MyOrdersDrawer.tsx
// Extracted from the old renderMyOrders() inline function in App.tsx
import React from 'react';
import { X, Receipt, Star } from 'lucide-react';
import { useStore } from '../store/useStore';

export function MyOrdersDrawer() {
  const { currentUser, orders, setShowMyOrders, setActiveTrackingId } = useStore();
  const myOrders = orders.filter((o) => o.customer?.uid === currentUser?.uid);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
        <div className="p-5 sm:p-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
          <h2 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt size={24} className="text-orange-500" /> My Orders
          </h2>
          <button
            onClick={() => setShowMyOrders(false)}
            aria-label="Close"
            className="p-2 sm:p-2.5 bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {myOrders.length === 0 ? (
            <div className="text-center py-10 opacity-70">
              <Receipt size={40} className="mx-auto text-slate-300 mb-4" />
              <p className="font-bold text-slate-500">You haven't placed any orders yet!</p>
            </div>
          ) : (
            myOrders.map((order) => {
              const allRated = order.items.every((i) => i.rating > 0);
              const isLive = order.status !== 'Delivered';

              return (
                <div key={order.dbId} className="border border-slate-100 bg-slate-50 p-4 rounded-2xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-slate-800">{order.displayId}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${isLive ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                      {isLive ? 'Live' : 'Completed'}
                    </span>
                  </div>

                  <ul className="text-xs text-slate-500 font-medium mb-3 space-y-1">
                    {order.items.map((i) => (
                      <li key={i.id} className="flex items-center justify-between">
                        <span>{i.qty}x {i.name}</span>
                        {i.rating > 0 && (
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={10} className={s <= i.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-3 mt-2">
                    <span className="font-black text-lg text-slate-900">₹{order.total}</span>
                    <button
                      onClick={() => { setActiveTrackingId(order.dbId); setShowMyOrders(false); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all ${
                        !isLive && allRated
                          ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isLive ? 'Track Order' : allRated ? 'View Order' : 'Rate Items'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
