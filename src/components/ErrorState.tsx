// src/components/ErrorState.tsx
import React from 'react';
import { WifiOff } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-red-50 p-6 rounded-[2rem] mb-6 shadow-inner border border-red-100">
        <WifiOff size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Connection Lost</h2>
      <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mb-8 leading-relaxed">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-slate-900 hover:bg-orange-500 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all active:scale-95"
      >
        Retry Connection
      </button>
    </div>
  );
}
