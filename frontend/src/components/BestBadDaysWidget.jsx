import React from 'react';
import { useBestBadDays } from '../hooks/useBestBadDays';

const DayCard = ({ day, totalR, totalTrades, winRate, type }) => {
  const isProfit = type === 'best';
  return (
    <div
      className={`rounded-xl p-4 border transition-all duration-200 hover:-translate-y-0.5 ${
        isProfit
          ? 'bg-emerald-950/40 border-emerald-800/30 hover:border-emerald-700/50'
          : 'bg-rose-950/40 border-rose-800/30 hover:border-rose-700/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-0.5 flex items-center gap-1">
            <i className={isProfit ? "ri-fire-fill text-amber-400" : "ri-snowflake-fill text-blue-400"} />
            {isProfit ? 'Best Day' : 'Bad Day'}
          </p>
          <p className="text-base font-bold text-white">{day}</p>
        </div>
        <span
          className={`text-lg font-bold font-mono-nums ${
            isProfit ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {totalR >= 0 ? '+' : ''}{totalR}R
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">Trades</span>
          <span className="text-sm font-semibold text-slate-300">{totalTrades}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">Win Rate</span>
          <span className={`text-sm font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {winRate}%
          </span>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = ({ type }) => (
  <div className={`rounded-xl p-4 border ${type === 'best' ? 'border-emerald-900/30 bg-emerald-950/20' : 'border-rose-900/30 bg-rose-950/20'}`}>
    <div className="skeleton h-3 w-16 mb-3" />
    <div className="skeleton h-5 w-24 mb-3" />
    <div className="flex gap-3">
      <div className="skeleton h-4 w-12" />
      <div className="skeleton h-4 w-12" />
    </div>
  </div>
);

const BestBadDaysWidget = () => {
  const { data, loading } = useBestBadDays();

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <i className="ri-trophy-line text-amber-400 text-base" />
          Best &amp; Worst Trading Days
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Best Days */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-emerald-500/80 mb-1 flex items-center gap-1">
            <i className="ri-arrow-up-circle-fill text-emerald-400" /> Top 2 Best
          </p>
          {loading
            ? [0, 1].map((i) => <SkeletonCard key={i} type="best" />)
            : data.bestDays.length > 0
            ? data.bestDays.map((d) => <DayCard key={d.day} {...d} type="best" />)
            : <p className="text-sm text-slate-600 italic">No data yet</p>
          }
        </div>

        {/* Bad Days */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-rose-500/80 mb-1 flex items-center gap-1">
            <i className="ri-arrow-down-circle-fill text-rose-400" /> Top 2 Worst
          </p>
          {loading
            ? [0, 1].map((i) => <SkeletonCard key={i} type="bad" />)
            : data.badDays.length > 0
            ? data.badDays.map((d) => <DayCard key={d.day} {...d} type="bad" />)
            : <p className="text-sm text-slate-600 italic">No data yet</p>
          }
        </div>
      </div>
    </div>
  );
};

export default BestBadDaysWidget;
