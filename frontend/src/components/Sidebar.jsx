import React from 'react';
import { useAdmin } from '../context/AdminContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { isAdmin, lock } = useAdmin();

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
    { id: 'analytics', label: 'Analytics', icon: 'ri-bar-chart-2-line' },
    { id: 'reports', label: 'Reports', icon: 'ri-file-chart-line' },
    { id: 'trades', label: 'Trades', icon: 'ri-file-list-3-line' },
    { id: 'notebook', label: 'Notebook', icon: 'ri-book-2-line' },
  ];

  return (
    <aside className="w-60 min-h-screen bg-[#0b0e14] border-r border-slate-800/80 flex flex-col justify-between p-4 sticky top-0 h-screen z-40 hidden md:flex select-none">
      {/* Top Logo & Brand */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-cyan-950/50">
            <i className="ri-bar-chart-box-fill" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1 font-sans">
              DIGI <span className="text-cyan-400">DATA</span>
            </h1>
            <span className="text-[10px] font-medium text-slate-500 tracking-widest uppercase">
              Live Trading
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-950/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
              >
                <i className={`${item.icon} text-base ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Actions */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        {/* Settings & Conditional Logout */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'settings'
                ? 'text-cyan-400 bg-slate-800/60 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            <i className="ri-settings-3-line text-slate-500 text-base" />
            <span>Settings</span>
          </button>

          {/* Only shown to Admin; completely hidden for Visitors */}
          {isAdmin && (
            <button
              onClick={lock}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Logout (Switch to Visitor mode)"
            >
              <i className="ri-logout-box-r-line text-rose-400 text-base" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
