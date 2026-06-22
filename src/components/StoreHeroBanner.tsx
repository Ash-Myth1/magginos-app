// src/components/StoreHeroBanner.tsx
// The hero section — extracted out of App.tsx for clean separation.
import React from 'react';
import { UtensilsCrossed, Clock } from 'lucide-react';
import type { CrewUser } from '../types';

interface StoreHeroBannerProps {
  isOpen: boolean;
  currentUser: CrewUser | null;
  onLogin: () => void;
}

export function StoreHeroBanner({ isOpen, currentUser, onLogin }: StoreHeroBannerProps) {
  if (!isOpen) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-800 p-5 sm:p-6 rounded-[2rem] shadow-sm flex items-center gap-4 sm:gap-5">
        <div className="bg-red-100 p-3 sm:p-4 rounded-full shadow-inner">
          <Clock size={28} className="text-red-600" />
        </div>
        <div>
          <p className="font-black text-lg sm:text-xl text-red-900 leading-tight">Maggino's is Currently Sleeping</p>
          <p className="text-xs sm:text-sm text-red-700 mt-1 font-medium">The chef is resting. Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-all duration-700 group-hover:bg-orange-500/20" />

      <div className="space-y-3 relative z-10 text-center md:text-left w-full md:w-auto">
        <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-full mb-2 border border-orange-500/20">
          Now Delivering
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Late night <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">cravings?</span>
        </h2>
        <p className="text-slate-300 font-medium text-sm sm:text-lg max-w-sm mx-auto md:mx-0">
          Hot, fresh Maggi delivered right to your hostel room in minutes.
        </p>
        {!currentUser && (
          <button
            onClick={onLogin}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 backdrop-blur-sm flex items-center gap-2 mx-auto md:mx-0"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 bg-white rounded-full p-0.5" alt="Google" />
            Sign in to order
          </button>
        )}
      </div>

      <div className="hidden md:flex bg-white/10 p-6 rounded-[2rem] backdrop-blur-md border border-white/10 items-center justify-center relative z-10 shadow-xl group-hover:rotate-6 transition-transform duration-500">
        <UtensilsCrossed size={56} className="text-orange-400 drop-shadow-lg" />
      </div>
    </div>
  );
}
