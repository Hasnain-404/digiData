import React from 'react';

const Navbar = ({ activeTab, onNewJournal, onImportExcel }) => {
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
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Import Excel Button */}
          <button
            id="btn-import-excel"
            onClick={onImportExcel}
            className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm"
            title="Upload and auto-scrape trade data from Excel file"
          >
            <i className="ri-file-excel-2-line text-base text-emerald-400" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>

          {/* New Journal Button */}
          <button
            id="btn-new-journal"
            onClick={onNewJournal}
            className="flex items-center gap-1.5 px-2 sm:px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all duration-200 active:scale-95"
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
