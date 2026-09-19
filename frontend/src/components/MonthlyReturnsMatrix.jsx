import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

const MONTH_HEADERS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyReturnsMatrix = () => {
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('All');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/analytics/monthly-returns`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMatrixData(res.data || []);
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

  if (!matrixData.length) {
    return (
      <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl h-48 flex flex-col items-center justify-center gap-2 text-slate-500">
        <i className="ri-table-2 text-3xl text-slate-700" />
        <p className="text-sm">No trade data yet. Upload your Excel sheet to see monthly returns.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="ri-table-2 text-cyan-400" /> Percentage Profit by Month
        </h3>
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          {['Percent', 'Profit', 'All'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-lg transition-all ${viewMode === mode
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
              <th className="p-3 text-left">Year</th>
              {MONTH_HEADERS.map((m) => (
                <th key={m} className="p-3">{m}</th>
              ))}
              <th className="p-3 bg-slate-950/80 text-cyan-400">YTD</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row) => (
              <tr key={row.year} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                <td className="p-3 text-left font-bold text-white bg-slate-900/40">{row.year}</td>

                {row.months.map((cell) => {
                  const pctVal = typeof cell.pct === 'number' && !isNaN(cell.pct) ? cell.pct : 0;
                  const amtVal = typeof cell.amount === 'number' && !isNaN(cell.amount) ? cell.amount : 0;
                  const isZero = cell.trades === 0;
                  const isProfit = pctVal > 0;

                  const intensity = Math.min(Math.abs(pctVal) / 10, 1);
                  const bgStyle = isZero
                    ? {}
                    : isProfit
                      ? { backgroundColor: `rgba(16,185,129,${intensity * 0.15})` }
                      : { backgroundColor: `rgba(244,63,94,${intensity * 0.15})` };

                  return (
                    <td key={cell.month} className="p-2 font-mono leading-tight" style={bgStyle}>
                      {isZero ? (
                        <span className="text-slate-700">—</span>
                      ) : (
                        <div>
                          {(viewMode === 'Percent' || viewMode === 'All') && (
                            <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{pctVal.toFixed(2)}%
                            </div>
                          )}
                          {(viewMode === 'Profit' || viewMode === 'All') && (
                            <div className={`text-[10px] ${isProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                              {amtVal >= 0 ? '+$' : '-$'}{Math.abs(amtVal).toFixed(0)}
                            </div>
                          )}
                          {viewMode === 'All' && (
                            <div className="text-[9px] text-slate-600 mt-0.5">{cell.trades}T</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* YTD Total */}
                <td className="p-2 font-mono bg-slate-950/60 leading-tight">
                  {(() => {
                    const ytdPctVal = typeof row.ytdPct === 'number' && !isNaN(row.ytdPct) ? row.ytdPct : 0;
                    const ytdAmtVal = typeof row.ytdAmount === 'number' && !isNaN(row.ytdAmount) ? row.ytdAmount : 0;
                    return (
                      <>
                        <div className={`font-extrabold text-xs ${ytdPctVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ytdPctVal >= 0 ? '+' : ''}{ytdPctVal.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {row.ytdTrades || 0} trades
                        </div>
                        <div className={`text-[10px] font-mono ${ytdAmtVal >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                          {ytdAmtVal >= 0 ? '+$' : '-$'}{Math.abs(ytdAmtVal).toFixed(0)}
                        </div>
                      </>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyReturnsMatrix;
