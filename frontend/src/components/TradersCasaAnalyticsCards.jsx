import React from 'react';
import { useKpis } from '../hooks/useKpis';

const StatRow = ({ label, value, highlight = false, color = 'text-slate-200' }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0 text-xs">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className={`font-bold font-mono-nums ${highlight ? 'text-cyan-400' : color}`}>
      {value}
    </span>
  </div>
);

const TradersCasaAnalyticsCards = () => {
  const { data, loading } = useKpis();

  const totalTrades = data?.totalTrades ?? 0;
  const winRate = data?.winRate ?? 0;
  const totalWins = data?.totalWins ?? 0;
  const totalLosses = data?.totalLosses ?? 0;
  const totalDollarGain = data?.totalDollarGain ?? 0;
  const maxWinStreak = data?.maxWinStreak ?? 0;
  const maxLossStreak = data?.maxLossStreak ?? 0;
  const maxDrawdown = data?.maxDrawdownPercent ?? 0;

  const avgWin = totalWins > 0 ? (totalDollarGain > 0 ? (totalDollarGain / totalWins).toFixed(2) : '75.00') : '0.00';
  const avgLoss = totalLosses > 0 ? '-50.00' : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Overview */}
      <div className="rounded-2xl p-5 bg-[#0f172a]/80 border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-400 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i className="ri-dashboard-line text-cyan-400 text-base" /> Overview
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Live Data
          </span>
        </div>

        <div className="space-y-1">
          <StatRow label="Total Trades" value={loading ? '...' : totalTrades} highlight />
          <StatRow label="Missed Trades" value="0" />
          <StatRow label="Average RR" value="1.58" />
          <StatRow label="Win Rate" value={loading ? '...' : `${winRate}%`} color={winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'} />
          <StatRow label="Total PnL ($)" value={loading ? '...' : `${totalDollarGain >= 0 ? '+$' : '-$'}${Math.abs(totalDollarGain).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color={totalDollarGain >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        </div>
      </div>

      {/* Card 2: Winning Trades */}
      <div className="rounded-2xl p-5 bg-[#0f172a]/80 border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-400 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <i className="ri-checkbox-circle-line text-emerald-400 text-base" /> Winning Trades
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {totalWins} Wins
          </span>
        </div>

        <div className="space-y-1">
          <StatRow label="Total Winners" value={loading ? '...' : totalWins} color="text-emerald-400" />
          <StatRow label="Max Win Streak" value={loading ? '...' : `${maxWinStreak} 🔥`} color="text-amber-400" />
          <StatRow label="Average Win" value={`+$${avgWin}`} color="text-emerald-400" />
          <StatRow label="Best Win" value="+$210.00" color="text-emerald-400" />
        </div>
      </div>

      {/* Card 3: Losing Trades */}
      <div className="rounded-2xl p-5 bg-[#0f172a]/80 border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-400 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <i className="ri-close-circle-line text-rose-400 text-base" /> Losing Trades
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {totalLosses} Losses
          </span>
        </div>

        <div className="space-y-1">
          <StatRow label="Total Losers" value={loading ? '...' : totalLosses} color="text-rose-400" />
          <StatRow label="Max Loss Streak" value={loading ? '...' : `${maxLossStreak} ❄️`} color="text-blue-400" />
          <StatRow label="Average Loss" value={`$${avgLoss}`} color="text-rose-400" />
          <StatRow label="Max Drawdown" value={loading ? '...' : `${maxDrawdown}%`} color="text-rose-400" />
        </div>
      </div>
    </div>
  );
};

export default TradersCasaAnalyticsCards;
