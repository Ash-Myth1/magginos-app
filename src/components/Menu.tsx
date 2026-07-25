// src/components/Menu.tsx
import { useState } from 'react';
import { Plus, AlertCircle, Sparkles, Search } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Menu() {
  const { menuItems, isStoreOpen, addToCart, getEffectiveOutOfStockIds, cart, getRemainingStock } = useStore();
  const effectiveOutIds = getEffectiveOutOfStockIds();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-slate-500">No menu items available right now.</p>
        <p className="text-sm text-slate-400 mt-2">Please check back later!</p>
      </div>
    );
  }

  const tags = ['All', ...Array.from(new Set(menuItems.map((item) => item.tag)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'All' || item.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="text-orange-500" size={24} />
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Midnight Menu</h2>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search menu…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all border border-slate-100"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              selectedTag === tag
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-bold text-slate-500">No items match your search.</p>
          <p className="text-sm text-slate-400 mt-2">Try a different keyword or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredItems.map((item) => {
            const isOut = effectiveOutIds.includes(item.id);

            // Check actual prep count limit against what's already in the cart
            const remaining = getRemainingStock ? getRemainingStock(item) : null;
            const cartItem = cart.find(c => c.id === item.id);
            const currentCartQty = cartItem ? cartItem.qty : 0;

            const limit = remaining !== null ? Math.min(remaining, 10) : 10;
            const isMaxedOut = currentCartQty >= limit;

            const disabled = isOut || !isStoreOpen || isMaxedOut;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 ${
                  disabled ? 'opacity-60 grayscale-[20%]' : 'hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1'
                }`}
              >
                <div>
                  {/* Lazy-loaded image */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-40 object-cover rounded-2xl mb-4"
                    />
                  ) : (
                    <div className="w-full h-40 rounded-2xl mb-4 bg-gradient-to-br from-slate-100 to-slate-50" />
                  )}

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
      )}
    </div>
  );
}