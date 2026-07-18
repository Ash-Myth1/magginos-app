// src/components/intelligence/ReviewIntelligence.tsx
// Visual dashboard panel for NLP review analytics — aspect-based sentiment,
// topic distribution, hourly issue heatmap, and recent reviews feed.
// Desktop-first design.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquareText, ThumbsUp, ThumbsDown, Minus,
  AlertCircle, Clock, ChevronDown, ChevronUp,
  Sparkles, TrendingDown, ListFilter,
} from 'lucide-react';
import type { ReviewInsights, SentimentStatus, AspectTopic } from '../../intelligence/nlp';

interface ReviewIntelligenceProps {
  insights: ReviewInsights;
}

// ── Utility: sentiment badge colors ─────────────────────────────────────────
function sentimentBadge(status: SentimentStatus): { bg: string; icon: React.ReactNode } {
  switch (status) {
    case 'Positive':
      return { bg: 'bg-green-100 text-green-700 border-green-200', icon: <ThumbsUp size={11} /> };
    case 'Negative':
      return { bg: 'bg-red-100 text-red-700 border-red-200', icon: <ThumbsDown size={11} /> };
    case 'Neutral':
      return { bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Minus size={11} /> };
  }
}

function topicColor(topic: AspectTopic): string {
  switch (topic) {
    case 'Food Quality': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Delivery Time': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Packaging': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'Portion Size': return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'Service': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'Value for Money': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'General': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function ReviewIntelligence({ insights }: ReviewIntelligenceProps) {
  const [filterTopic, setFilterTopic] = useState<AspectTopic | 'all'>('all');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('breakdown');

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const filteredReviews = filterTopic === 'all'
    ? insights.processedReviews
    : insights.processedReviews.filter(r => r.topic === filterTopic);

  const displayedReviews = showAllReviews ? filteredReviews : filteredReviews.slice(0, 8);

  const totalReviews = insights.processedReviews.length;
  const negativeCount = insights.processedReviews.filter(r => r.status === 'Negative').length;
  const positiveCount = insights.processedReviews.filter(r => r.status === 'Positive').length;
  const neutralCount = insights.processedReviews.filter(r => r.status === 'Neutral').length;

  // ── Empty state: demo mode is OFF and no real reviews have come in yet ──
  // Show a waiting state instead of the misleading "All Clear! 🎉" hero card.
  if (!insights.isUsingDemoData && totalReviews === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <MessageSquareText size={32} className="text-slate-300" />
        </div>
        <h4 className="font-black text-slate-700 text-lg mb-2">No Reviews Yet</h4>
        <p className="text-sm text-slate-400 font-medium max-w-xs leading-relaxed">
          Customer feedback will appear here once orders have been rated.
          Toggle <span className="font-bold text-violet-500">Demo Data</span> above to preview what the dashboard looks like.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══════ 1. BIGGEST ISSUE HERO CARD ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-6 border ${
          negativeCount > 0
            ? 'bg-gradient-to-r from-red-50 via-orange-50/50 to-amber-50/30 border-red-200'
            : 'bg-gradient-to-r from-green-50 via-emerald-50/50 to-teal-50/30 border-green-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${
            negativeCount > 0 ? 'bg-red-100' : 'bg-green-100'
          }`}>
            {negativeCount > 0
              ? <AlertCircle size={24} className="text-red-600" />
              : <Sparkles size={24} className="text-green-600" />
            }
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-base mb-1">
              {negativeCount > 0 ? "Today's Biggest Issue" : 'All Clear!'}
            </h4>
            <p className={`text-sm font-bold ${negativeCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {insights.biggestIssue}
            </p>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Positive', count: positiveCount, color: 'text-green-600', bg: 'bg-green-100/80' },
            { label: 'Negative', count: negativeCount, color: 'text-red-600', bg: 'bg-red-100/80' },
            { label: 'Neutral', count: neutralCount, color: 'text-slate-500', bg: 'bg-slate-100/80' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════ 2. ASPECT BREAKDOWN TABLE ═══════ */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection('breakdown')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <ListFilter size={18} className="text-indigo-600" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">Aspect Breakdown</h4>
          </div>
          {expandedSection === 'breakdown' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {expandedSection === 'breakdown' && (
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
                    <th className="text-left py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">👍</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">👎</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">➖</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.topicSummary.map((ts, i) => {
                    const posPct = ts.total > 0 ? (ts.positive / ts.total) * 100 : 0;
                    const negPct = ts.total > 0 ? (ts.negative / ts.total) * 100 : 0;
                    const neuPct = ts.total > 0 ? (ts.neutral / ts.total) * 100 : 0;

                    return (
                      <tr key={i} className="border-b border-slate-100/60 hover:bg-white/60 transition-colors">
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${topicColor(ts.topic)}`}>
                            {ts.topic}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-green-600">{ts.positive}</td>
                        <td className="py-3 px-2 text-center font-bold text-red-600">{ts.negative}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-400">{ts.neutral}</td>
                        <td className="py-3 px-2 text-center font-black text-slate-700">{ts.total}</td>
                        <td className="py-3 px-2">
                          {/* Stacked bar */}
                          <div className="flex h-5 rounded-full overflow-hidden bg-slate-100">
                            {posPct > 0 && (
                              <div className="bg-green-400 transition-all duration-500" style={{ width: `${posPct}%` }} title={`Positive: ${Math.round(posPct)}%`} />
                            )}
                            {neuPct > 0 && (
                              <div className="bg-slate-300 transition-all duration-500" style={{ width: `${neuPct}%` }} title={`Neutral: ${Math.round(neuPct)}%`} />
                            )}
                            {negPct > 0 && (
                              <div className="bg-red-400 transition-all duration-500" style={{ width: `${negPct}%` }} title={`Negative: ${Math.round(negPct)}%`} />
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Positive</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Neutral</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Negative</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══════ 3. HOURLY ISSUES ═══════ */}
      {insights.hourlyIssues.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('hourly')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Clock size={18} className="text-amber-600" />
              </div>
              <h4 className="font-black text-slate-800 text-sm">Issues by Hour</h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Time Patterns</span>
            </div>
            {expandedSection === 'hourly' ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {expandedSection === 'hourly' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="px-5 pb-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {insights.hourlyIssues.map((issue, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                      <TrendingDown size={14} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800">{issue.topic}</p>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock size={10} />
                        {issue.hour} · {issue.count} complaint{issue.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════ 4. RECENT REVIEWS FEED ═══════ */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 p-2 rounded-xl">
              <MessageSquareText size={18} className="text-cyan-600" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">Recent Reviews</h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              {totalReviews} total
            </span>
          </div>

          {/* Topic filter */}
          <select
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value as AspectTopic | 'all')}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
          >
            <option value="all">All Topics</option>
            <option value="Food Quality">Food Quality</option>
            <option value="Delivery Time">Delivery Time</option>
            <option value="Packaging">Packaging</option>
            <option value="Portion Size">Portion Size</option>
            <option value="Service">Service</option>
            <option value="Value for Money">Value for Money</option>
            <option value="General">General</option>
          </select>
        </div>

        <div className="p-5 space-y-3">
          {displayedReviews.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquareText size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">No reviews found</p>
              <p className="text-xs text-slate-300 mt-1">Reviews will appear here as customers leave feedback</p>
            </div>
          ) : (
            displayedReviews.map((review, i) => {
              const badge = sentimentBadge(review.status);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                          {review.orderId}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {review.itemName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                        "{review.originalText}"
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${topicColor(review.topic)}`}>
                        {review.topic}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${badge.bg}`}>
                        {badge.icon} {review.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {filteredReviews.length > 8 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full text-center py-3 text-sm font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-all"
            >
              {showAllReviews ? 'Show Less' : `Show All ${filteredReviews.length} Reviews`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
