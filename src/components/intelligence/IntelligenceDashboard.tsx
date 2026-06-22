// src/components/intelligence/IntelligenceDashboard.tsx
// Tabbed wrapper for the Inventory Forecasting and Review Intelligence panels.
// Integrated into AdminDashboard.tsx — receives orders + menuItems from the store.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, BarChart3, MessageSquareText, ToggleLeft, ToggleRight,
  Sparkles, AlertTriangle,
} from 'lucide-react';
import type { Order, MenuItem } from '../../types';
import {
  generateInventoryInsights,
  generateDemoOrders,
  type InventoryInsights,
} from '../../intelligence/inventory';
import {
  generateReviewInsights,
  type ReviewInsights,
} from '../../intelligence/nlp';
import { InventoryIntelligence } from './InventoryIntelligence';
import { ReviewIntelligence } from './ReviewIntelligence';
import { useStore } from '../../store/useStore';

type Tab = 'inventory' | 'reviews';

interface IntelligenceDashboardProps {
  orders: Order[];
  menuItems: MenuItem[];
}

export function IntelligenceDashboard({ orders, menuItems }: IntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [demoMode, setDemoMode] = useState(false);
  const actualPrepCounts = useStore(s => s.actualPrepCounts);

  // Determine if we have enough real data
  const realOrderCount = orders.length;
  const realFeedbackCount = orders.reduce(
    (sum, o) => sum + o.items.filter(i => i.feedback && i.feedback.trim() !== '').length,
    0
  );
  const hasLimitedData = realOrderCount < 10;
  const hasLimitedFeedback = realFeedbackCount < 5;

  // Compute insights — memoized to avoid recalculating on every render
  const inventoryInsights: InventoryInsights = useMemo(() => {
    const effectiveOrders = demoMode || hasLimitedData
      ? [...orders, ...generateDemoOrders(menuItems)]
      : orders;
    return generateInventoryInsights(effectiveOrders, menuItems, actualPrepCounts);
  }, [orders, menuItems, demoMode, hasLimitedData, actualPrepCounts]);

  const reviewInsights: ReviewInsights = useMemo(() => {
    const effectiveOrders = demoMode || hasLimitedFeedback
      ? (() => {
          // For reviews, we need orders with feedback. Generate demo orders with feedback.
          const demoOrders = generateDemoOrders(menuItems);
          return [...orders, ...demoOrders];
        })()
      : orders;
    return generateReviewInsights(effectiveOrders);
  }, [orders, menuItems, demoMode, hasLimitedFeedback]);

  const isShowingDemo = demoMode || hasLimitedData || hasLimitedFeedback;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'inventory',
      label: 'Inventory Forecasting',
      icon: <BarChart3 size={18} />,
      count: inventoryInsights.stockoutAlerts.length,
    },
    {
      id: 'reviews',
      label: 'Review Intelligence',
      icon: <MessageSquareText size={18} />,
      count: reviewInsights.processedReviews.filter(r => r.status === 'Negative').length,
    },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                Operations Intelligence
                <Sparkles size={16} className="text-violet-400" />
              </h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">
                Real-time forecasting & analytics
              </p>
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-3">
            {isShowingDemo && (
              <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-500/30">
                <AlertTriangle size={12} />
                {demoMode ? 'Demo Mode' : 'Includes Simulated Data'}
              </span>
            )}
            <button
              onClick={() => setDemoMode(!demoMode)}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/50 hover:border-slate-600"
            >
              {demoMode ? (
                <ToggleRight size={18} className="text-violet-400" />
              ) : (
                <ToggleLeft size={18} />
              )}
              Demo Data
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mt-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className={`ml-1 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-black rounded-full px-1.5 ${
                  activeTab === tab.id
                    ? 'bg-red-100 text-red-600'
                    : 'bg-red-500/30 text-red-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' ? (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <InventoryIntelligence insights={inventoryInsights} />
            </motion.div>
          ) : (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ReviewIntelligence insights={reviewInsights} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
