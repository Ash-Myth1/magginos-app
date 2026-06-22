// src/components/Menu.tsx
import React from 'react';
import { Plus, AlertCircle, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Menu() {
  const { menuItems, isStoreOpen, addToCart, getEffectiveOutOfStockIds, cart, getRemainingStock } = useStore();
  const effectiveOutIds = getEffectiveOutOfStockIds();

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-slate-500">No menu items available right now.</p>
        <p className="text-sm text-slate-400 mt-2">Please check back later!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="text-orange-500" size={24} />
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Midnight Menu</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {menuItems.map((item) => {
          const isOut = effectiveOutIds.includes(item.id);
          
          // Check actual prep count limit against what's already in the cart
          const remaining = getRemainingStock ? getRemainingStock(item) : null;
          const cartItem = cart.find(c => c.id === item.id);
          const currentCartQty = cartItem ? cartItem.qty : 0;
          const isMaxedOut = remaining !== null && currentCartQty >= remaining;
          
          const disabled = isOut || !isStoreOpen || isMaxedOut;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 ${
                disabled ? 'opacity-60 grayscale-[20%]' : 'hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {item.tag}
                  </span>
                  {isOut && (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg shadow-sm">
                      <AlertCircle size={14} /> Sold Out
                    </span>
                  )}
                </div>
                <h3 className="font-black text-xl text-slate-800 mb-2 leading-tight">{item.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>

              <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-50">
                <span className="font-black text-2xl text-slate-900">₹{item.price}</span>
                <button
                  onClick={() => addToCart(item)}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                    disabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-orange-500 shadow-lg hover:shadow-orange-500/30'
                  }`}
                >
                  {isMaxedOut ? <span className="text-xs">Limit Reached</span> : <><Plus size={18} /> Add</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}