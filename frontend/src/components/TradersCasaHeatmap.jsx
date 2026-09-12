import React, { useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { getDaysInMonth, getDay } from 'date-fns';
import DayTradesDrawer from './DayTradesDrawer';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TradersCasaHeatmap = () => {
  const { days, month, year, prevMonth, nextMonth } = useCalendar();
  const [selectedDay, setSelectedDay] = useState(null);

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDays = getDaysInMonth(firstDayOfMonth);
  // Mon-start offset (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
  const startOffset = (getDay(firstDayOfMonth) + 6) % 7;

  const tiles = [];
  for (let i = 0; i < startOffset; i++) tiles.push(null);
  for (let d = 1; d <= totalDays; d++) tiles.push(d);

  // Compute weeks based on calendar grid rows (Mon-Fri/Sun)
  const weekMap = {};
  for (let d = 1; d <= totalDays; d++) {
    const weekNum = Math.floor((d - 1 + startOffset) / 7) + 1;
    if (!weekMap[weekNum]) {
      weekMap[weekNum] = { weekNum, pnl: 0, trades: 0 };
    }
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = days[key];
    if (dayData) {
      weekMap[weekNum].pnl += dayData.totalDollarPnl || 0;
      weekMap[weekNum].trades += dayData.tradeCount || 0;
    }
  }

  const weeks = Object.values(weekMap).map((w) => ({
    label: `Week ${w.weekNum}`,
    pnl: w.pnl,
    trades: w.trades,
    isProfit: w.pnl >= 0,
  }));

  const dayEntries = Object.values(days || {});
  const totalMonthlyPnl = dayEntries.reduce((s, d) => s + (d.totalDollarPnl || 0), 0);
  const totalMonthlyTrades = dayEntries.reduce((s, d) => s + (d.tradeCount || 0), 0);
  const isMonthlyProfit = totalMonthlyPnl >= 0;

  const formatCompactPnl = (value) => {
    const absoluteValue = Math.abs(value);
    const sign = value >= 0 ? '+$' : '-$';
    if (absoluteValue >= 1000) return `${sign}${Math.round(absoluteValue / 1000)}k`;
    return `${sign}${Math.round(absoluteValue)}`;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid (Takes 2 cols) */}
        <div className="lg:col-span-2 rounded-2xl p-2 sm:p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl space-y-4">
          {/* Month Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <i className="ri-calendar-check-fill text-cyan-400" />
              {MONTH_NAMES[month - 1]} <span className="text-slate-400">{year}</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <i className="ri-arrow-left-s-line text-lg" />
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <i className="ri-arrow-right-s-line text-lg" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 py-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
              <div key={`${d}-${index}`}>{d}</div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {tiles.map((day, idx) => {
              const key = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayData = key ? days[key] : null;

              const isProfit = dayData && dayData.totalR > 0;
              const isLoss = dayData && dayData.totalR < 0;

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDay({ dateKey: key, dayData })}
                  className={`h-20 sm:h-24 min-w-0 overflow-hidden rounded-xl p-1.5 sm:p-2 border flex flex-col justify-between transition-all duration-200 ${!day
                    ? 'border-transparent bg-transparent cursor-default'
                    : 'cursor-pointer hover:scale-[1.03] active:scale-95'
                    } ${isProfit
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/40 hover:border-emerald-400'
                      : isLoss
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40 hover:border-rose-400'
                        : day
                          ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                          : ''
                    }`}
                >
                  {day && (
                    <>
                      <span className="text-xs font-bold text-slate-300">{day}</span>
                      {dayData ? (
                        <div className="w-full min-w-0 overflow-hidden text-right">
                          <p className={`truncate whitespace-nowrap text-[9px] leading-tight sm:text-xs sm:font-extrabold font-mono-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span className="sm:hidden">{formatCompactPnl(dayData.totalDollarPnl)}</span>
                            <span className="hidden sm:inline">
                              {dayData.totalDollarPnl >= 0 ? '+$' : '-$'}{Math.abs(dayData.totalDollarPnl).toFixed(2)}
                            </span>
                          </p>
                          <p className="truncate whitespace-nowrap text-[9px] leading-tight sm:text-[10px] text-slate-400 font-medium">
                            <span className="sm:hidden">{dayData.tradeCount}T</span>
                            <span className="hidden sm:inline">{dayData.tradeCount} trade{dayData.tradeCount > 1 ? 's' : ''}</span>
                          </p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* P&L By Week Side Panel (Takes 1 col) */}
        <div className="rounded-2xl p-6 bg-[#0e131f] border border-slate-800/80 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="ri-bar-chart-2-fill text-cyan-400" /> P&amp;L By Week
              </h3>
              <span className="text-xs font-medium text-slate-400">{MONTH_NAMES[month - 1]} {year}</span>
            </div>

            <div className="space-y-2.5">
              {weeks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-600 gap-2">
                  <i className="ri-bar-chart-2-line text-2xl" />
                  <p className="text-xs text-center">No trades this month</p>
                </div>
              ) : (
                weeks.map((w) => (
                  <div
                    key={w.label}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${w.isProfit
                      ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-rose-950/40 border-rose-500/30 hover:border-rose-500/50'
                      }`}
                  >
                    <span className="text-xs font-bold text-slate-200">{w.label}</span>
                    <div className="text-right">
                      <p className={`text-xs font-extrabold font-mono-nums ${w.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {w.isProfit ? '+$' : '-$'}{Math.abs(w.pnl).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400">{w.trades} Trade{w.trades > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Total */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between mt-2 ${isMonthlyProfit
              ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/40'
              : 'bg-gradient-to-r from-rose-950/80 to-red-950/80 border-rose-500/40'
              }`}
          >
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${isMonthlyProfit ? 'text-emerald-300' : 'text-rose-300'
                }`}
            >
              Monthly Total
            </span>
            <div className="text-right">
              <p
                className={`text-sm font-extrabold font-mono-nums ${isMonthlyProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}
              >
                {isMonthlyProfit ? '+$' : '-$'}{Math.abs(totalMonthlyPnl).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">{totalMonthlyTrades} Trades</p>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Day Trades Drawer */}
      {selectedDay && (
        <DayTradesDrawer
          dateKey={selectedDay.dateKey}
          dayData={selectedDay.dayData}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
};

export default TradersCasaHeatmap;
