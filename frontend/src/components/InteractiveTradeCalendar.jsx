import React, { useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import DayTradesDrawer from './DayTradesDrawer';
import { format, getDaysInMonth, getDay } from 'date-fns';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const InteractiveTradeCalendar = () => {
  const { days, month, year, loading, nextMonth, prevMonth, refetch } = useCalendar();
  const [selectedDate, setSelectedDate] = useState(null);

  // Build the grid
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDays = getDaysInMonth(firstDayOfMonth);
  const startOffset = (getDay(firstDayOfMonth) + 6) % 7;

  const tiles = [];
  for (let i = 0; i < startOffset; i++) tiles.push(null);
  for (let d = 1; d <= totalDays; d++) tiles.push(d);

  const getDateKey = (day) => {
    if (!day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDayData = (day) => {
    const key = getDateKey(day);
    return key ? days[key] : null;
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const data = getDayData(day);
    if (!data) return;
    setSelectedDate({ day, key: getDateKey(day), data });
  };

  return (
    <>
      <div className="glass-card rounded-xl p-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <i className="ri-calendar-check-line text-blue-400" />
              {MONTH_NAMES[month - 1]} <span className="text-slate-400">{year}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {Object.keys(days).length} active trading days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 mr-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />Profit
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/30" />Loss
              </span>
            </div>
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all text-lg"
              title="Previous Month"
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all text-lg"
              title="Next Month"
            >
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1.5">
            {Array(35).fill(null).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {tiles.map((day, idx) => {
              const dayData = day ? getDayData(day) : null;
              const isProfit = dayData && dayData.totalR > 0;
              const isLoss = dayData && dayData.totalR < 0;
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() + 1 &&
                year === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative h-16 rounded-lg border p-1.5 flex flex-col justify-between transition-all duration-150
                    ${!day ? 'border-transparent' : ''}
                    ${day && !dayData ? 'border-slate-800/60 hover:border-slate-700' : ''}
                    ${isProfit ? 'cal-tile-profit cursor-pointer hover:bg-emerald-900/20' : ''}
                    ${isLoss ? 'cal-tile-loss cursor-pointer hover:bg-rose-900/20' : ''}
                    ${dayData && !isProfit && !isLoss ? 'border-slate-700/40 bg-slate-800/20 cursor-pointer' : ''}
                    ${isToday && !dayData ? 'border-blue-700/40 bg-blue-900/10' : ''}
                  `}
                >
                  {day && (
                    <>
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? 'text-blue-400' : dayData ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        {day}
                      </span>
                      {dayData && (
                        <div className="text-right">
                          <div
                            className={`text-xs font-bold font-mono-nums leading-tight ${
                              isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {dayData.totalR >= 0 ? '+' : ''}{dayData.totalR}R
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {dayData.tradeCount}T
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedDate && (
        <DayTradesDrawer
          dateKey={selectedDate.key}
          dayData={selectedDate.data}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
};

export default InteractiveTradeCalendar;
