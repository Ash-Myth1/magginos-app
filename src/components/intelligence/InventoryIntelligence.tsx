// src/components/intelligence/InventoryIntelligence.tsx
// Visual dashboard panel for inventory forecasting, stockout alerts, and demand analytics.
// Desktop-first design with CSS-only charts and premium glassmorphic cards.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Turtle, AlertTriangle, TrendingUp, TrendingDown,
  Clock, Package, BarChart3, ChevronDown, ChevronUp,
  Zap, ShieldAlert, Trash2,
} from 'lucide-react';
import type { InventoryInsights } from '../../intelligence/inventory';

interface InventoryIntelligenceProps {
  insights: InventoryInsights;
}

// ── Utility: format hour label ──────────────────────────────────────────────
function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour} ${ampm}`;
}

// ── Utility: risk color based on score ──────────────────────────────────────
function riskColor(score: number): string {
  if (score >= 70) return 'text-red-600 bg-red-50 border-red-100';
  if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-green-600 bg-green-50 border-green-100';
}

function riskBarColor(score: number): string {
  if (score >= 70) return 'bg-gradient-to-r from-red-400 to-red-500';
  if (score >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-green-400 to-green-500';
}

function confidenceBadge(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

export function InventoryIntelligence({ insights }: InventoryIntelligenceProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('forecast');

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const maxDailyQty = Math.max(
    ...insights.dailyForecast.map(f => Math.max(f.soldToday, f.projectedTotal, f.avgDaily)),
    1
  );

  return (
    <div className="space-y-6">

      {/* ═══════ 1. STOCKOUT ALERTS (always visible, top priority) ═══════ */}
      {insights.stockoutAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-red-50 via-red-50/50 to-orange-50/30 border border-red-200 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-xl">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <h4 className="font-black text-red-800 text-sm tracking-tight">Stockout Alerts</h4>
              <p className="text-red-500 text-[11px] font-medium">Items predicted to run out soon</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.stockoutAlerts.map((alert, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 leading-tight">{alert.itemName}</p>
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    Likely to run out {alert.predictedHour}
                  </p>
                  <span className={`inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${confidenceBadge(alert.confidence)}`}>
                    {alert.confidence} confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════ 2. DAILY SALES FORECAST ═══════ */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection('forecast')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <BarChart3 size={18} className="text-blue-600" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">Daily Sales Forecast</h4>
          </div>
          {expandedSection === 'forecast' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {expandedSection === 'forecast' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-5 pb-5"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sold Today</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Daily</th>
                    <th className="py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.dailyForecast.map((item, i) => {
                    const pct = maxDailyQty > 0 ? (item.soldToday / maxDailyQty) * 100 : 0;
                    const projPct = maxDailyQty > 0 ? (item.projectedTotal / maxDailyQty) * 100 : 0;
                    const isAboveAvg = item.soldToday > item.avgDaily;

                    return (
                      <tr key={i} className="border-b border-slate-100/60 hover:bg-white/60 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800">{item.itemName}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black text-lg ${isAboveAvg ? 'text-green-600' : 'text-slate-700'}`}>
                            {item.soldToday}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-500">{item.projectedTotal}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-400">{item.avgDaily}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
                            {/* Projected (background) */}
                            <div
                              className="absolute inset-y-0 left-0 bg-blue-100 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(projPct, 100)}%` }}
                            />
                            {/* Actual sold (foreground) */}
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                isAboveAvg
                                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                  : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                            {/* Average marker */}
                            {item.avgDaily > 0 && (
                              <div
                                className="absolute inset-y-0 w-0.5 bg-slate-400/60"
                                style={{ left: `${Math.min((item.avgDaily / maxDailyQty) * 100, 100)}%` }}
                                title={`Avg: ${item.avgDaily}`}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 inline-block" /> Sold Today</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-100 inline-block" /> Projected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-slate-400/60 inline-block" /> Daily Avg</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══════ 3. FAST & SLOW MOVING ITEMS ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fast Moving */}
        <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/30 border border-orange-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <h4 className="font-black text-slate-800 text-sm">Fast Moving</h4>
            <Zap size={14} className="text-amber-500" />
          </div>
          {insights.fastMoving.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium italic">No data yet</p>
          ) : (
            <div className="space-y-2">
              {insights.fastMoving.map((item, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-sm border border-orange-100/60 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-orange-400 to-red-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.qty} units sold</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                    item.velocity === 'hot'
                      ? 'bg-red-100 text-red-600 border-red-200'
                      : 'bg-amber-100 text-amber-600 border-amber-200'
                  }`}>
                    {item.velocity === 'hot' ? '🔥 Hot' : '📈 Rising'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow Moving */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Turtle size={18} className="text-slate-400" />
            <h4 className="font-black text-slate-800 text-sm">Slow Moving</h4>
          </div>
          {insights.slowMoving.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium italic">No data yet</p>
          ) : (
            <div className="space-y-2">
              {insights.slowMoving.map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-200 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black">
                      <TrendingDown size={14} />
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {item.qty} units · {
                          item.daysSinceLastOrder === null ? 'Never ordered' :
                          item.daysSinceLastOrder === 0 ? 'Ordered today' :
                          `${item.daysSinceLastOrder}d since last order`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ 4. WASTAGE RISK ═══════ */}
      {insights.wastageAlerts.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('wastage')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Trash2 size={18} className="text-amber-600" />
              </div>
              <h4 className="font-black text-slate-800 text-sm">Wastage Risk Analysis</h4>
            </div>
            {expandedSection === 'wastage' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {expandedSection === 'wastage' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="px-5 pb-5 space-y-3"
            >
              {insights.wastageAlerts.map((alert, i) => (
                <div key={i} className={`border rounded-xl p-4 flex items-center gap-4 ${riskColor(alert.riskScore)}`}>
                  <div className="w-14 h-14 shrink-0 relative">
                    {/* Circular gauge */}
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${alert.riskScore} ${100 - alert.riskScore}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
                      {alert.riskScore}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800">{alert.itemName}</p>
                    <p className="text-xs font-medium opacity-80 mt-0.5">{alert.reason}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════ 5. HOURLY DEMAND HEATMAP ═══════ */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection('heatmap')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 p-2 rounded-xl">
              <TrendingUp size={18} className="text-violet-600" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">Hourly Demand Heatmap</h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">11 PM – 5 AM</span>
          </div>
          {expandedSection === 'heatmap' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {expandedSection === 'heatmap' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-5 pb-5"
          >
            <HourlyHeatmap data={insights.hourlyDemand} />
          </motion.div>
        )}
      </div>
    </div>
  );
}


// ── Sub-component: Hourly Demand Heatmap ────────────────────────────────────
function HourlyHeatmap({ data }: { data: Record<string, number[]> }) {
  const items = Object.entries(data);
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 italic font-medium">No hourly data available</p>;
  }

  // Operating hours: 23, 0, 1, 2, 3, 4
  const opHours = [23, 0, 1, 2, 3, 4];

  // Find max value for color scaling
  const allVals = items.flatMap(([, arr]) => opHours.map(h => arr[h] ?? 0));
  const maxVal = Math.max(...allVals, 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50">
              Item
            </th>
            {opHours.map(h => (
              <th key={h} className="text-center py-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {formatHour(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(([name, hourly]) => (
            <tr key={name} className="border-t border-slate-100/60">
              <td className="py-2 px-2 font-bold text-xs text-slate-700 whitespace-nowrap sticky left-0 bg-white/80 backdrop-blur-sm">
                {name}
              </td>
              {opHours.map(h => {
                const val = hourly[h] ?? 0;
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const bg = val === 0
                  ? 'bg-slate-50'
                  : intensity > 0.75
                    ? 'bg-violet-500 text-white'
                    : intensity > 0.5
                      ? 'bg-violet-400 text-white'
                      : intensity > 0.25
                        ? 'bg-violet-200 text-violet-800'
                        : 'bg-violet-100 text-violet-700';

                return (
                  <td key={h} className="py-2 px-1 text-center">
                    <span className={`inline-flex items-center justify-center w-9 h-8 rounded-lg text-xs font-bold transition-all ${bg}`}>
                      {val}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-slate-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          <span className="w-4 h-3 rounded bg-slate-50 border border-slate-200" />
          <span className="w-4 h-3 rounded bg-violet-100" />
          <span className="w-4 h-3 rounded bg-violet-200" />
          <span className="w-4 h-3 rounded bg-violet-400" />
          <span className="w-4 h-3 rounded bg-violet-500" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
