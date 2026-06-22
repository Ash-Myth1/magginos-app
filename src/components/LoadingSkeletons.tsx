// src/components/LoadingSkeletons.tsx
import React from 'react';

export function LoadingSkeletons() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-200 h-64 sm:h-72 rounded-[2rem] sm:rounded-[2.5rem] animate-pulse w-full" />
      <div>
        <div className="h-8 bg-slate-200 rounded-lg animate-pulse w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 h-48 flex flex-col justify-between">
              <div>
                <div className="h-5 bg-slate-200 rounded-md animate-pulse w-24 mb-4" />
                <div className="h-6 bg-slate-200 rounded-md animate-pulse w-3/4 mb-2" />
              </div>
              <div className="flex justify-between mt-6">
                <div className="h-8 bg-slate-200 rounded-md animate-pulse w-16" />
                <div className="h-10 bg-slate-200 rounded-2xl animate-pulse w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
