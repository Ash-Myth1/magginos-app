// src/components/Header.tsx
import React from 'react';
import { ShoppingCart, LogOut, ChevronLeft, Receipt, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface HeaderProps {
  currentView: 'customer' | 'admin';
  onLogin: () => void;
  onLogout: () => void;
}

export function Header({ currentView, onLogin, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const { currentUser, cartCount, setShowMyOrders, setShowCheckout } = useStore();

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-100 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">

        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Maggino's" className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
          <span className="font-black text-xl tracking-tight text-slate-800 uppercase">Maggino's</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {currentView === 'customer' ? (
            currentUser ? (
              <>
                <button onClick={() => setShowMyOrders(true)} aria-label="My orders" className="p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
                  <Receipt size={22} />
                </button>
                <button onClick={() => setShowCheckout(true)} aria-label="Cart" className="relative p-2 text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
                  <ShoppingCart size={22} />
                  {cartCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                      {cartCount()}
                    </span>
                  )}
                </button>
                <button onClick={onLogout} aria-label="Logout" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )
          ) : (
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95">
              <ChevronLeft size={16} /> Exit Kitchen
            </button>
          )}
        </div>
      </div>
    </header>
  );
}