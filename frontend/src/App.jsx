import React, { useState, useCallback } from 'react';
import useTradeSync from './hooks/useTradeSync';
import toast, { Toaster } from 'react-hot-toast';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import KpiSummaryBar from './components/KpiSummaryBar';
import TradersCasaAnalyticsCards from './components/TradersCasaAnalyticsCards';
import TradersCasaHeatmap from './components/TradersCasaHeatmap';
import MonthlyReturnsMatrix from './components/MonthlyReturnsMatrix';
import TradeJournalTable from './components/TradeJournalTable';
import TradeModalForm from './components/TradeModalForm';
import ExcelImportModal from './components/ExcelImportModal';
import NotebookView from './components/NotebookView';
import BacktestView from './components/BacktestView';
import DayBreakdownTable from './components/DayBreakdownTable';
import { AdminProvider } from './context/AdminContext';
import AdminPinModal from './components/AdminPinModal';


const SectionHeader = ({ title, subtitle, icon }) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/40">
    <div className="flex items-center gap-2.5">
      <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
      <div>
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 font-sans">
          {icon && <i className={`${icon} text-cyan-400 text-base`} />}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTradeSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ── Live sync: bump refreshKey whenever an update occurs ──
  useTradeSync(handleTradeSuccess);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    const toastId = toast.loading('Connecting to Google Sheet...');
    try {
      const apiBase = import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
        : 'https://digidata.onrender.com/api/v1';

      const res = await fetch(`${apiBase}/trades/sync-google-sheet`, {
        method: 'POST',
        headers: {
          'x-admin-pin': localStorage.getItem('digidata_owner_pin') || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Google Sheet synced! (${data.total || 0} trades)`, { id: toastId });
        handleTradeSuccess();
      } else {
        toast.error(data.message || 'Failed to sync Google Sheet', { id: toastId });
      }
    } catch (err) {
      toast.error('Could not reach backend to sync Google Sheet', { id: toastId });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#090d16] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#f1f5f9',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#06b6d4', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }}
      />

      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onNewJournal={() => setIsModalOpen(true)}
          onImportExcel={() => setIsExcelModalOpen(true)}
          onSyncGoogleSheet={handleSyncGoogleSheet}
          isSyncingSheet={isSyncingSheet}
        />

        {/* Main Content Area */}
        <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8 flex-1">
          {/* ── DASHBOARD VIEW ────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <>
              <section id="section-kpis">
                <SectionHeader title="Performance Overview" subtitle="All-time account statistics" icon="ri-dashboard-3-line" />
                <KpiSummaryBar key={`kpi-${refreshKey}`} />
              </section>

              <section id="section-traderscasa-heatmap">
                <SectionHeader title="Interactive Trade Calendar" subtitle="Daily profit tiles & weekly breakdowns" icon="ri-calendar-event-line" />
                <TradersCasaHeatmap key={`heatmap-${refreshKey}`} />
              </section>

              <section id="section-monthly-matrix">
                <SectionHeader title="Monthly Returns Breakdown" subtitle="Annual percentage profit table" icon="ri-table-2" />
                <MonthlyReturnsMatrix key={`matrix-${refreshKey}`} />
              </section>

              <section id="section-traderscasa-cards">
                <SectionHeader title="Performance Analytics" subtitle="Trade execution & streak metrics" icon="ri-bar-chart-box-line" />
                <TradersCasaAnalyticsCards key={`tc-cards-${refreshKey}`} />
              </section>

              <section id="section-journal" className="pb-8">
                <SectionHeader title="Trade Journal" subtitle="Full log of all executed trades" icon="ri-table-line" />
                <TradeJournalTable key={`tbl-${refreshKey}`} onTradeDeleted={handleTradeSuccess} />
              </section>
            </>
          )}

          {/* ── NOTEBOOK VIEW ─────────────────────────────────────────────── */}
          {activeTab === 'notebook' && <NotebookView />}

          {/* ── ANALYTICS VIEW ────────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <>
              <section>
                <SectionHeader title="Analytics Overview" subtitle="Detailed performance breakdown" icon="ri-bar-chart-2-line" />
                <KpiSummaryBar key={`kpi-analytics-${refreshKey}`} />
              </section>
              <section>
                <SectionHeader title="Weekday Performance" subtitle="Day-by-day win rate, R-multiple & best/worst trading days" icon="ri-calendar-check-line" />
                <DayBreakdownTable key={`day-breakdown-${refreshKey}`} />
              </section>
              <section>
                <TradersCasaAnalyticsCards key={`tc-cards-analytics-${refreshKey}`} />
              </section>
              <section>
                <TradersCasaHeatmap key={`heatmap-analytics-${refreshKey}`} />
              </section>
              <section>
                <MonthlyReturnsMatrix key={`matrix-analytics-${refreshKey}`} />
              </section>
            </>
          )}

          {/* ── REPORTS VIEW ──────────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <>
              <section>
                <SectionHeader title="Performance Reports" subtitle="Account equity curve & monthly matrix" icon="ri-file-chart-line" />
                <KpiSummaryBar key={`kpi-reports-${refreshKey}`} />
              </section>
              <section>
                <MonthlyReturnsMatrix key={`matrix-reports-${refreshKey}`} />
              </section>
            </>
          )}

          {/* ── TRADES VIEW ───────────────────────────────────────────────── */}
          {activeTab === 'trades' && (
            <section className="pb-8">
              <SectionHeader title="Executed Trade Log" subtitle="All backtested & live trades" icon="ri-file-list-3-line" />
              <TradeJournalTable key={`tbl-trades-${refreshKey}`} onTradeDeleted={handleTradeSuccess} />
            </section>
          )}

          {/* ── BACKTEST VIEW ─────────────────────────────────────────────── */}
          {activeTab === 'backtest' && <BacktestView />}

          {/* ── COMMUNITY VIEW ────────────────────────────────────────────── */}
          {activeTab === 'community' && (
            <section className="space-y-6">
              <SectionHeader title="Community & Trader Hub" subtitle="Share setups & learn from top traders" icon="ri-team-line" />
              <div className="p-8 rounded-2xl bg-[#0e131f] border border-slate-800 text-center space-y-3">
                <i className="ri-team-fill text-4xl text-cyan-400" />
                <h3 className="text-lg font-bold text-white">DigiData Community</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">Connect with fellow backtesters, share strategy rules, trade logs, and review weekly setup confluence.</p>
              </div>
            </section>
          )}

          {/* ── SETTINGS VIEW ─────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <section className="space-y-6">
              <SectionHeader title="Settings & Preferences" subtitle="Manage account risk and backtest parameters" icon="ri-settings-3-line" />
              <div className="p-6 rounded-2xl bg-[#0e131f] border border-slate-800 max-w-xl space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Account Starting Balance ($)</label>
                  <input type="number" defaultValue={5000} className="w-full p-2.5 rounded-xl bg-[#0b0e14] border border-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Risk Per Trade (%)</label>
                  <input type="number" defaultValue={1} className="w-full p-2.5 rounded-xl bg-[#0b0e14] border border-slate-800 text-white" />
                </div>
                <button className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">Save Settings</button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ── Trade Entry Modal ────────────────────────────────────────────── */}
      <TradeModalForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTradeSuccess}
      />

      {/* ── Excel Import & Scrape Modal ───────────────────────────────────── */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={handleTradeSuccess}
      />
    </div>
  );
};

const App = () => (
  <AdminProvider>
    <AppContent />
    <AdminPinModal />
  </AdminProvider>
);

export default App;