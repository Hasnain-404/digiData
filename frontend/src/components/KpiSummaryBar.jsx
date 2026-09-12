import React from 'react';
import { useKpis } from '../hooks/useKpis';

const fmt = (n, prefix = '') =>
  n === undefined || n === null
    ? '—'
    : `${prefix}${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const fmtR = (n) =>
  n === undefined || n === null
    ? '—'
    : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}R`;

const KpiCard = ({
  label,
  value,
  subValue,
  color = 'neutral',
  iconClass,
  iconBg = 'bg-slate-800/80 text-slate-400 border-slate-700/60',
  progressPct = null,
  hero = false,
  loading,
}) => {
  const colorMap = {
    profit: 'text-emerald-400',
    loss: 'text-rose-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
    neutral: 'text-slate-100',
  };

  const textColor = colorMap[color] || colorMap.neutral;

  return (
    <div
      className={`relative rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        hero
          ? 'bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 border-blue-500/30 shadow-lg shadow-blue-950/20 hover:border-blue-500/50'
          : 'bg-[#111827]/80 backdrop-blur-xl border-slate-800/80 hover:border-slate-700 hover:shadow-black/40'
      }`}
    >
      {/* Top Card Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shadow-inner ${iconBg}`}
        >
          <i className={iconClass} />
        </div>
      </div>

      {/* Card Value */}
      {loading ? (
        <div className="space-y-2 py-1">
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-4 w-20" />
        </div>
      ) : (
        <div>
          <div className={`text-2xl font-extrabold font-mono-nums tracking-tight ${textColor}`}>
            {value}
          </div>

          {/* Optional Progress Bar for Win Rate */}
          {progressPct !== null && (
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden my-2 border border-slate-700/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          )}

          {/* Subtitle / Context */}
          {subValue && (
            <div className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1">
              {subValue}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const KpiSummaryBar = () => {
  const { data, loading } = useKpis();

  const cards = [
    {
      label: 'Account Balance',
      value: fmt(data?.currentBalance, '$'),
      subValue: data?.totalDollarGain !== undefined
        ? `${data.totalDollarGain >= 0 ? '+$' : '-$'}${Math.abs(data.totalDollarGain).toLocaleString('en-US', { minimumFractionDigits: 2 })} Total PnL`
        : 'Current Equity',
      color: 'blue',
      iconClass: 'ri-bank-card-fill',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      hero: true,
    },
    {
      label: 'Total Return (R)',
      value: fmtR(data?.totalR),
      subValue: data?.totalR >= 0 ? '🔥 Profitable Performance' : '❄️ Drawdown State',
      color: data?.totalR >= 0 ? 'profit' : 'loss',
      iconClass: 'ri-funds-box-fill',
      iconBg: data?.totalR >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      hero: true,
    },
    {
      label: 'Win Rate',
      value: data ? `${data.winRate}%` : '—',
      subValue: data ? `${data.totalWins} Wins / ${data.totalLosses} Losses` : '—',
      color: data?.winRate >= 50 ? 'profit' : 'loss',
      iconClass: 'ri-pie-chart-2-fill',
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      progressPct: data ? data.winRate : 0,
    },
    {
      label: 'Total Trades',
      value: data?.totalTrades ?? '—',
      subValue: 'Executed Journal Entries',
      color: 'violet',
      iconClass: 'ri-file-list-3-fill',
      iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    },
    {
      label: 'Starting Balance',
      value: fmt(data?.startingBalance, '$'),
      subValue: 'Initial Account Deposit',
      color: 'neutral',
      iconClass: 'ri-wallet-3-fill',
      iconBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    },
    {
      label: 'Max Drawdown',
      value: data ? `${data.maxDrawdownPercent}%` : '—',
      subValue: 'Peak to Trough Loss',
      color: 'loss',
      iconClass: 'ri-line-chart-down-fill',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      label: 'Max Win Streak',
      value: data ? `${data.maxWinStreak} Trades` : '—',
      subValue: 'Consecutive Wins 🔥',
      color: 'profit',
      iconClass: 'ri-fire-fill',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      label: 'Max Loss Streak',
      value: data ? `${data.maxLossStreak} Trades` : '—',
      subValue: 'Consecutive Losses ❄️',
      color: 'loss',
      iconClass: 'ri-snowflake-fill',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {cards.map((card, i) => (
        <KpiCard key={i} {...card} loading={loading} />
      ))}
    </div>
  );
};

export default KpiSummaryBar;
