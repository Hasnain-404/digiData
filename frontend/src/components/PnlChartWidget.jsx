import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1';

const fmt = (n) =>
  n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;

const fmtR = (n) =>
  n >= 0 ? `+${n.toFixed(2)}R` : `${n.toFixed(2)}R`;

const PnlChartWidget = () => {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('Dollar'); // 'Dollar' | 'R'

  useEffect(() => {
    fetch(`${API_BASE}/analytics/weekly-pnl`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMonths(res.data || []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!months.length) {
    return (
      <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl h-48 flex flex-col items-center justify-center gap-2 text-slate-500">
        <i className="ri-bar-chart-grouped-line text-3xl text-slate-700" />
        <p className="text-sm">No trade data yet. Upload your Excel sheet to see P&amp;L by week.</p>
      </div>
    );
  }

  // Flatten all weeks from all months into a single array
  const allWeeks = months.flatMap((month) =>
    month.weeks.map((week) => ({ ...week, monthYear: month.monthYear }))
  );

  return (
    <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="ri-bar-chart-grouped-line text-cyan-400" /> P&amp;L By Week
        </h3>
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          {['Dollar', 'R'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-lg transition-all ${viewMode === mode
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {mode === 'Dollar' ? '$ PnL' : 'R Multiple'}
            </button>
          ))}
        </div>
      </div>

      {/* All Week Cards — flat grid, no month sections */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allWeeks.map((week, idx) => {
          const val = viewMode === 'Dollar' ? week.dollarPnl : week.totalR;
          const isPos = val >= 0;

          return (
            <div
              key={idx}
              className={`relative rounded-xl p-3.5 border flex flex-col gap-1.5 transition-all hover:-translate-y-0.5 ${isPos
                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                }`}
            >
              {/* Month + Week label */}
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {week.monthYear} · W{week.weekOfMonth}
              </span>

              {/* Value */}
              <span className={`text-base font-extrabold font-mono leading-tight ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {viewMode === 'Dollar' ? fmt(week.dollarPnl) : fmtR(week.totalR)}
              </span>

              {/* Trade count */}
              <span className="text-[10px] text-slate-500">
                {week.trades} {week.trades === 1 ? 'Trade' : 'Trades'}
              </span>

              {/* Indicator dot */}
              <div className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PnlChartWidget;
