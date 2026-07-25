// src/components/ErrorState.tsx
import { WifiOff, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-red-50 p-6 rounded-[2rem] mb-6 shadow-inner border border-red-100">
        <WifiOff size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Connection Lost</h2>
      <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mb-8 leading-relaxed">{message}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-900 hover:bg-orange-500 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all active:scale-95"
        >
          Retry Connection
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-500 transition-colors py-3.5 px-4"
        >
          <Home size={16} />
          Go Home
        </Link>
      </div>
    </div>
  );
}
