import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import LightboxModal from './LightboxModal';

const sessionClass = {
  Asian: 'badge-asian',
  London: 'badge-london',
  'New York': 'badge-newyork',
  'Off-Hours': 'badge-offhours',
};

const resultClass = {
  TP: 'badge-tp',
  SL: 'badge-sl',
  BE: 'badge-be',
};

const DayTradesDrawer = ({ dateKey, dayData, onClose }) => {
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !activeLightboxImage) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, activeLightboxImage]);

  // Prevent body scroll while drawer open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const { trades = [], totalR = 0, totalDollarPnl = 0, tradeCount = 0 } = dayData || {};
  const formattedDate = dateKey
    ? format(new Date(dateKey + 'T00:00:00'), 'EEEE, MMMM do yyyy')
    : '';

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-overlay animate-fade-in" onClick={onClose} />

      {/* Panel */}
      <div className="drawer-panel animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-[#111827] border-b border-slate-800 p-5 z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-medium">
                <i className="ri-calendar-event-line text-blue-400" /> Daily Trades Overview
              </p>
              <h3 className="text-base font-bold text-white">{formattedDate}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-lg bg-slate-800/60 p-3 text-center border border-slate-700/40">
              <p className="text-xs text-slate-500 font-medium">Trades</p>
              <p className="text-lg font-bold text-white">{tradeCount}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3 text-center border border-slate-700/40">
              <p className="text-xs text-slate-500 font-medium">Total R</p>
              <p className={`text-lg font-bold font-mono-nums ${totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalR >= 0 ? '+' : ''}{totalR}R
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3 text-center border border-slate-700/40">
              <p className="text-xs text-slate-500 font-medium">PnL $</p>
              <p className={`text-lg font-bold font-mono-nums ${totalDollarPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalDollarPnl >= 0 ? '+' : ''}${Math.abs(totalDollarPnl).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Trade list */}
        <div className="p-4 flex flex-col gap-3">
          {trades.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No trades found for this day.</p>
          ) : (
            trades.map((trade, idx) => (
              <div
                key={trade._id || idx}
                className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4 hover:border-slate-600 transition-all duration-150 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{trade.pair}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sessionClass[trade.session] || 'badge-offhours'}`}>
                      {trade.session}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${resultClass[trade.result] || ''}`}>
                    {trade.result}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Time (UTC)</span><span className="text-slate-200 font-medium">{trade.time}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Entry</span>
                    <span className={`font-semibold ${trade.entryType === 'Long' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.entryType === 'Long' ? '↑ Long' : '↓ Short'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Risk %</span><span className="text-slate-200">{trade.riskPercent}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Risk $</span><span className="text-slate-200">${trade.riskDollar?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 col-span-2">
                    <span>Profit R</span>
                    <span className={`font-bold font-mono-nums ${trade.profitR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.profitR >= 0 ? '+' : ''}{trade.profitR}R
                    </span>
                  </div>
                </div>

                {/* Trade Chart Image Card */}
                {trade.imageUrl ? (
                  <div className="mt-1 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900 group relative">
                    <div className="relative h-40 w-full overflow-hidden cursor-pointer" onClick={() => setActiveLightboxImage(trade.imageUrl)}>
                      <img
                        src={trade.imageUrl}
                        alt={`${trade.pair} trade setup chart`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                        onError={(e) => {
                          e.target.parentElement.innerHTML = `
                            <div class="h-full w-full flex items-center justify-center p-3 text-xs text-slate-400 bg-slate-900/90 text-center">
                              <span class="flex items-center gap-1.5"><i class="ri-link text-blue-400"></i> Chart Link Attached</span>
                            </div>
                          `;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                        <span className="text-xs text-white font-medium flex items-center gap-1">
                          <i className="ri-zoom-in-line text-blue-400" /> Click to enlarge
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/90 flex items-center justify-between border-t border-slate-800 text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <i className="ri-image-line text-emerald-400" /> Trade Setup Chart
                      </span>
                      <a
                        href={trade.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Full Link <i className="ri-external-link-line" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 p-2.5 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-600">
                    No chart image attached for this trade
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightboxImage && (
        <LightboxModal
          imageUrl={activeLightboxImage}
          onClose={() => setActiveLightboxImage(null)}
        />
      )}
    </>
  );
};

export default DayTradesDrawer;
