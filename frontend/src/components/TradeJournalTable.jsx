import React, { useState } from 'react';
import { useTrades } from '../hooks/useTrades';
import { useAdmin } from '../context/AdminContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import TradeModalForm from './TradeModalForm';

const SESSION_CLASS = {
  Asian: 'badge-asian',
  London: 'badge-london',
  'New York': 'badge-newyork',
  'Off-Hours': 'badge-offhours',
};

const RESULT_CLASS = {
  TP: 'badge-tp',
  SL: 'badge-sl',
  BE: 'badge-be',
};

const SortIcon = ({ active, order }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`inline w-3 h-3 ml-1 ${active ? 'text-blue-400' : 'text-slate-600'}`}>
    {active && order === 'asc'
      ? <polyline points="18 15 12 9 6 15" />
      : <polyline points="6 9 12 15 18 9" />
    }
  </svg>
);

const SESSIONS = ['', 'Asian', 'London', 'New York', 'Off-Hours'];
const RESULTS = ['', 'TP', 'SL', 'BE'];

const formatJournalDate = (dateVal) => {
  if (!dateVal) return '—';
  const str = String(dateVal).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return format(new Date(y, m, d), 'd MMM yyyy');
    }
  }
  return str;
};

const TradeJournalTable = ({ refreshTrigger, onTradeDeleted }) => {
  const {
    trades, pagination, loading, error,
    page, setPage, filters, setFilters,
    sortBy, order, toggleSort,
    deleteTrade, refetch,
  } = useTrades();
  const { isAdmin } = useAdmin();

  const [deletingId, setDeletingId] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);

  const colHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'pair', label: 'Pair' },
    { key: 'session', label: 'Session' },
    { key: 'entryType', label: 'Direction' },
    { key: 'result', label: 'Result' },
    { key: 'profitR', label: 'Profit R' },
    { key: 'riskPercent', label: 'Risk %' },
    { key: 'riskDollar', label: 'Risk $' },
    { key: 'accountBalance', label: 'Balance' },
    { key: 'imageUrl', label: 'Chart' },
  ];

  const handleDeleteTrade = async (trade) => {
    const dateFormatted = formatJournalDate(trade.date);
    const confirmMsg = `Delete trade ${trade.pair} on ${dateFormatted} at ${trade.time} (${trade.profitR >= 0 ? '+' : ''}${trade.profitR}R ${trade.result})?\n\nThis will remove it from both the website AND your Excel/Google Sheet.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(trade._id);
    try {
      const res = await deleteTrade(trade._id);
      if (res.success) {
        toast.success(`Deleted ${trade.pair} (${dateFormatted} ${trade.time}) from database & Sheet.`);
        if (onTradeDeleted) onTradeDeleted();
      } else {
        toast.error(res.message || 'Failed to delete trade');
      }
    } catch (err) {
      toast.error('Error deleting trade');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">Trade Journal</h2>
          <p className="text-xs text-slate-500 mt-0.5">{pagination.total} total trades</p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          <select
            id="filter-session"
            value={filters.session}
            onChange={(e) => { setFilters((f) => ({ ...f, session: e.target.value })); setPage(1); }}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs outline-none focus:border-blue-500 transition-colors"
          >
            {SESSIONS.map((s) => <option key={s} value={s}>{s || 'All Sessions'}</option>)}
          </select>
          <select
            id="filter-result"
            value={filters.result}
            onChange={(e) => { setFilters((f) => ({ ...f, result: e.target.value })); setPage(1); }}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs outline-none focus:border-blue-500 transition-colors"
          >
            {RESULTS.map((r) => <option key={r} value={r}>{r || 'All Results'}</option>)}
          </select>
        </div>
      </div>

      {/* Table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              {colHeaders.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="cursor-pointer hover:text-slate-300 select-none"
                >
                  {label}
                  <SortIcon active={sortBy === key} order={order} />
                </th>
              ))}
              {isAdmin && <th className="text-center select-none">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(null).map((_, i) => (
                <tr key={i}>
                  {colHeaders.map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full" /></td>
                  ))}
                  {isAdmin && <td><div className="skeleton h-4 w-full" /></td>}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={colHeaders.length + (isAdmin ? 1 : 0)} className="text-center py-10 text-rose-400">
                  {error}
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={colHeaders.length + (isAdmin ? 1 : 0)} className="text-center py-12 text-slate-600">
                  <div className="flex flex-col items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-700">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p>No trades found. Log your first trade or import Excel!</p>
                  </div>
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="text-slate-300">
                    {formatJournalDate(trade.date)}
                  </td>
                  <td className="text-slate-400 font-mono-nums">{trade.time}</td>
                  <td className="text-white font-semibold">{trade.pair}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SESSION_CLASS[trade.session] || 'badge-offhours'}`}>
                      {trade.session}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs font-semibold ${trade.entryType === 'Long' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.entryType === 'Long' ? '▲ Long' : '▼ Short'}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RESULT_CLASS[trade.result] || ''}`}>
                      {trade.result}
                    </span>
                  </td>
                  <td className={`font-bold font-mono-nums ${trade.profitR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.profitR >= 0 ? '+' : ''}{trade.profitR}R
                  </td>
                  <td className="text-slate-400">{trade.riskPercent}%</td>
                  <td className="text-amber-400 font-mono-nums">${trade.riskDollar?.toFixed(2)}</td>
                  <td className="text-slate-300 font-mono-nums">${trade.accountBalance?.toLocaleString()}</td>
                  <td>
                    {trade.imageUrl ? (
                      <a
                        href={trade.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 text-xs font-medium transition-all"
                        title="Open chart in new tab"
                      >
                        <i className="ri-image-line text-xs" />
                        <span>View</span>
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingTrade(trade)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all inline-flex items-center justify-center"
                          title={`Edit ${trade.pair} (${trade.time})`}
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrade(trade)}
                          disabled={deletingId === trade._id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all inline-flex items-center justify-center"
                          title={`Delete ${trade.pair} (${trade.time}) from website & Sheet`}
                        >
                          {deletingId === trade._id ? (
                            <i className="ri-loader-4-line animate-spin text-sm text-rose-400" />
                          ) : (
                            <i className="ri-delete-bin-line text-sm" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} &bull; {pagination.total} trades
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 px-3 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              ◀ Prev
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = i + Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs border transition-all ${p === page
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="h-7 px-3 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              Next ▶
            </button>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {editingTrade && (
        <TradeModalForm
          isOpen={Boolean(editingTrade)}
          tradeToEdit={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSuccess={() => {
            setEditingTrade(null);
            refetch();
            if (onTradeDeleted) onTradeDeleted();
          }}
        />
      )}
    </div>
  );
};

export default TradeJournalTable;
