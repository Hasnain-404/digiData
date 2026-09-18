import React from 'react';
import { useAdmin } from '../context/AdminContext';

const Navbar = ({ activeTab, onNewJournal, onImportExcel, onSyncGoogleSheet, isSyncingSheet }) => {
  const { isAdmin, openPinModal, lock } = useAdmin();

  const handleProtectedAction = (action) => {
    if (isAdmin) {
      action?.();
    } else {
      openPinModal(action);
    }
  };

  const pageTitles = {
    dashboard: 'Dashboard',
    analytics: 'Analytics Overview',
    reports: 'Performance Reports',
    trades: 'Trade Log & Journal',
    backtest: 'Backtest Models',
    notebook: 'Notebook',
    community: 'Community Hub',
    settings: 'Settings & Preferences',
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b0e14]/90 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left Page Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white capitalize font-sans truncate">
            {pageTitles[activeTab] || 'Dashboard'}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Owner Mode Toggle Button */}
          {isAdmin ? (
            <button
              id="btn-owner-mode"
              onClick={lock}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm"
              title="Owner Mode Active — Click to switch to Read-Only Public Mode"
            >
              <i className="ri-lock-unlock-line text-sm text-emerald-400" />
              <span className="hidden sm:inline">Owner Mode</span>
            </button>
          ) : (
            <button
              id="btn-public-mode"
              onClick={() => openPinModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all duration-200 active:scale-95"
              title="Public View Mode (Read-Only) — Click to enter Owner PIN"
            >
              <i className="ri-lock-line text-sm text-slate-400" />
              <span className="hidden sm:inline">View Only</span>
            </button>
          )}

          {/* Sync Google Sheet Button */}
          <button
            id="btn-sync-sheet"
            onClick={() => handleProtectedAction(onSyncGoogleSheet)}
            disabled={isSyncingSheet}
            className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50"
            title="Sync all trades live from Google Sheet (Owner only)"
          >
            <i className={`ri-google-line text-base text-blue-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncingSheet ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          {/* Import Excel Button */}
          <button
            id="btn-import-excel"
            onClick={() => handleProtectedAction(onImportExcel)}
            className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm"
            title="Upload and auto-scrape trade data from Excel file (Owner only)"
          >
            <i className="ri-file-excel-2-line text-base text-emerald-400" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>

          {/* New Journal Button */}
          <button
            id="btn-new-journal"
            onClick={() => handleProtectedAction(onNewJournal)}
            className="flex items-center gap-1.5 px-2 sm:px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all duration-200 active:scale-95"
            title="Log new trade (Owner only)"
          >
            <i className="ri-add-line text-base" />
            <span className="hidden sm:inline">New Journal</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
