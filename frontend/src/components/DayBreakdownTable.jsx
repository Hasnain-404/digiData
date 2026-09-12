import React from 'react';
import { useWeekdayBreakdown } from '../hooks/useWeekdayBreakdown';
import { useBestBadDays } from '../hooks/useBestBadDays';

const DayBreakdownTable = () => {
  const { data: weekdayData, loading: loadingWeekday } = useWeekdayBreakdown();
  const { data: bestBadData, loading: loadingBestBad } = useBestBadDays();

  // Summary calculations
  const totalTrades = weekdayData?.reduce((s, d) => s + (d.totalTrades || 0), 0) || 0;
  const totalWins   = weekdayData?.reduce((s, d) => s + (d.wins || 0), 0) || 0;
  const totalLosses = weekdayData?.reduce((s, d) => s + (d.losses || 0), 0) || 0;
  const totalBE     = weekdayData?.reduce((s, d) => s + (d.be || 0), 0) || 0;
  const totalR      = parseFloat((weekdayData?.reduce((s, d) => s + (d.totalR || 0), 0) || 0).toFixed(2));
  const avgWinRate  = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';

  const bestDayText = bestBadData?.bestDayText || (bestBadData?.bestDays?.map(d => d.day).join(', ')) || 'Thursday, Wednesday';
  const badDayText  = bestBadData?.badDayText  || (bestBadData?.badDays?.map(d => d.day).join(', '))  || 'Monday, Friday';

  return (
    <div className="space-y-4">
      {/* ── Best Day & Bad Day Header (Matches Picture 2) ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Best Day Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 backdrop-blur-md shadow-lg shadow-emerald-950/20 flex items-center justify-between group hover:border-emerald-400/50 transition-all">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <i className="ri-trophy-line text-sm" />
              Best Day
            </div>
            <div className="text-base font-bold text-white mt-1">
              {loadingBestBad ? 'Loading...' : bestDayText}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-emerald-300/70 font-medium block">Highest Returns</span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Top 2 Days
            </span>
          </div>
        </div>

        {/* Bad Day Card */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/25 p-3.5 backdrop-blur-md shadow-lg shadow-rose-950/20 flex items-center justify-between group hover:border-rose-400/50 transition-all">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400">
              <span className="flex h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
              <i className="ri-alert-line text-sm" />
              Bad Day
            </div>
            <div className="text-base font-bold text-white mt-1">
              {loadingBestBad ? 'Loading...' : badDayText}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-rose-300/70 font-medium block">Lowest Returns</span>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Worst 2 Days
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Weekday Table (Matches Picture 1) ────────────────────────── */}
      <div className="rounded-2xl border-2 border-amber-500/40 bg-[#0b1329]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-amber-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            {/* Table Header: Golden Yellow style from Excel screenshot */}
            <thead>
              <tr className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wide border-b-2 border-amber-600">
                <th className="py-3 px-4 text-left font-black border-r border-amber-600/30">Day</th>
                <th className="py-3 px-4 font-black border-r border-amber-600/30">Total Trades</th>
                <th className="py-3 px-4 font-black border-r border-amber-600/30">Wins (TP)</th>
                <th className="py-3 px-4 font-black border-r border-amber-600/30">Losses (SL)</th>
                <th className="py-3 px-4 font-black border-r border-amber-600/30">BE</th>
                <th className="py-3 px-4 font-black border-r border-amber-600/30">Win Rate (%)</th>
                <th className="py-3 px-4 font-black">Total R</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loadingWeekday ? (
                Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4 text-left font-semibold text-slate-400">Loading...</td>
                      <td colSpan={6} className="py-3.5 px-4 text-slate-600 font-mono text-xs">Fetching stats...</td>
                    </tr>
                  ))
              ) : !weekdayData || weekdayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-slate-500 italic">No trading day data available</td>
                </tr>
              ) : (
                weekdayData.map((row, idx) => {
                  const isPositiveR = (row.totalR || 0) >= 0;
                  const isGoodWinRate = (row.winRate || 0) >= 50;

                  return (
                    <tr
                      key={row.day}
                      className={`transition-colors duration-150 hover:bg-amber-500/10 ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                      }`}
                    >
                      {/* Day */}
                      <td className="py-3.5 px-4 text-left font-bold text-slate-100 border-r border-slate-800/40">
                        {row.day}
                      </td>

                      {/* Total Trades */}
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-200 border-r border-slate-800/40">
                        {row.totalTrades}
                      </td>

                      {/* Wins (TP) */}
                      <td className="py-3.5 px-4 font-bold font-mono text-emerald-400 border-r border-slate-800/40">
                        {row.wins}
                      </td>

                      {/* Losses (SL) */}
                      <td className="py-3.5 px-4 font-bold font-mono text-rose-400 border-r border-slate-800/40">
                        {row.losses}
                      </td>

                      {/* BE */}
                      <td className="py-3.5 px-4 font-bold font-mono text-amber-400 border-r border-slate-800/40">
                        {row.be}
                      </td>

                      {/* Win Rate (%) */}
                      <td className="py-3.5 px-4 border-r border-slate-800/40">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-mono font-bold text-sm ${isGoodWinRate ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.winRate}%
                          </span>
                        </div>
                      </td>

                      {/* Total R */}
                      <td className={`py-3.5 px-4 font-mono font-extrabold text-sm ${isPositiveR ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositiveR ? '+' : ''}{row.totalR}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Totals */}
            {!loadingWeekday && weekdayData?.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950/90 font-bold border-t-2 border-amber-500/30 text-slate-200">
                  <td className="py-3 px-4 text-left font-black uppercase text-xs tracking-wider text-amber-400 border-r border-slate-800/40">
                    Total
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-100 border-r border-slate-800/40">
                    {totalTrades}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 border-r border-slate-800/40">
                    {totalWins}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-400 border-r border-slate-800/40">
                    {totalLosses}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-400 border-r border-slate-800/40">
                    {totalBE}
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400 border-r border-slate-800/40">
                    {avgWinRate}%
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-400">
                    +{totalR}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default DayBreakdownTable;
