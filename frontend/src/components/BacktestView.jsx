import React, { useState, useEffect } from 'react';

const COLOR_CLASSES = {
  cyan: {
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    text: 'text-cyan-400',
    btn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
    badge: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    text: 'text-emerald-400',
    btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
  },
  purple: {
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    text: 'text-purple-400',
    btn: 'bg-purple-500 hover:bg-purple-400 text-white',
    badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
  },
  amber: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    text: 'text-amber-400',
    btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
  },
  rose: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    text: 'text-rose-400',
    btn: 'bg-rose-500 hover:bg-rose-400 text-white',
    badge: 'bg-rose-950/70 border-rose-500/40 text-rose-300',
  },
};

const BacktestView = () => {
  const [liveStrategies, setLiveStrategies] = useState(() => {
    const saved = localStorage.getItem('liveStrategies');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('liveStrategies', JSON.stringify(liveStrategies));
  }, [liveStrategies]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSession, setFormSession] = useState('New York Session');
  const [formPairs, setFormPairs] = useState('EURUSD, GBPUSD');
  const [formWinRate, setFormWinRate] = useState('65');
  const [formRR, setFormRR] = useState('1:2.0');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('cyan');

  const activeStrategies = liveStrategies;

  const openCreateModal = () => {
    setEditingStrategy(null);
    setFormName('');
    setFormSession('New York Session');
    setFormPairs('EURUSD, GBPUSD');
    setFormWinRate('65');
    setFormRR('1:2.0');
    setFormDescription('');
    setFormColor('cyan');
    setIsModalOpen(true);
  };

  const openEditModal = (strat) => {
    setEditingStrategy(strat);
    setFormName(strat.name);
    setFormSession(strat.session);
    setFormPairs(strat.pairs);
    setFormWinRate(String(strat.winRate));
    setFormRR(strat.rr);
    setFormDescription(strat.description || '');
    setFormColor(strat.color || 'cyan');
    setIsModalOpen(true);
  };

  const handleSaveStrategy = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingStrategy) {
      // Update existing strategy
      setLiveStrategies((prev) =>
        prev.map((s) =>
          s.id === editingStrategy.id
            ? {
              ...s,
              name: formName.trim(),
              session: formSession,
              pairs: formPairs,
              winRate: parseFloat(formWinRate) || s.winRate,
              rr: formRR,
              description: formDescription,
              color: formColor,
            }
            : s
        )
      );
    } else {
      // Create new strategy
      const newStrat = {
        id: 'strat_' + Date.now(),
        name: formName.trim(),
        session: formSession,
        pairs: formPairs,
        winRate: parseFloat(formWinRate) || 60,
        rr: formRR,
        trades: 0,
        profitR: '+0.0R',
        description: formDescription,
        color: formColor,
        icon: 'ri-flashlight-line',
      };
      setLiveStrategies((prev) => [newStrat, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteStrategy = (id) => {
    setLiveStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <i className="ri-shape-2-line text-cyan-400" /> Backtest Strategy Models
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage, edit, and add active trading strategies.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <i className="ri-add-line text-base" />
          <span>+ Add Strategy</span>
        </button>
      </div>

      {/* Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeStrategies.map((strat) => {
          const theme = COLOR_CLASSES[strat.color] || COLOR_CLASSES.cyan;

          return (
            <div
              key={strat.id}
              className={`group relative rounded-2xl p-6 bg-[#0e131f] border ${theme.border} shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${theme.bg} border ${theme.border} ${theme.text} flex items-center justify-center text-xl font-bold shadow-md`}>
                    <i className={strat.icon || 'ri-flashlight-line'} />
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${theme.badge}`}>
                    {strat.session}
                  </span>
                </div>

                {/* Strategy Title & Pairs */}
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {strat.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    <i className="ri-coin-line text-slate-500 mr-1" />
                    {strat.pairs}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">
                  {strat.description}
                </p>

                {/* Performance Metrics Pills */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">Win Rate</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{strat.winRate}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">Avg R:R</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{strat.rr}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">Total Profit</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{strat.profitR}</span>
                  </div>
                </div>
              </div>

              {/* Action Button & Live Controls (Edit & Delete) */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all ${theme.btn}`}
                >
                  Execute Model
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(strat)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="Edit Strategy"
                  >
                    <i className="ri-pencil-line text-sm text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strat.id)}
                    className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 transition-colors"
                    title="Delete Strategy"
                  >
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Strategy Modal (Live Mode) ──────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0e14] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className={`${editingStrategy ? 'ri-pencil-fill text-amber-400' : 'ri-add-circle-fill text-cyan-400'}`} />
                {editingStrategy ? 'Edit Live Strategy' : 'Add Live Strategy'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveStrategy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Strategy Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. NY Session Fair Value Gap Scalp"
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Session</label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="New York Session">New York Session</option>
                    <option value="London Open">London Open</option>
                    <option value="Asia Session">Asia Session</option>
                    <option value="All Sessions">All Sessions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pairs / Instruments</label>
                  <input
                    type="text"
                    required
                    value={formPairs}
                    onChange={(e) => setFormPairs(e.target.value)}
                    placeholder="EURUSD, GBPUSD"
                    className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Win Rate %</label>
                  <input
                    type="number"
                    value={formWinRate}
                    onChange={(e) => setFormWinRate(e.target.value)}
                    placeholder="65"
                    className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Avg R:R</label>
                  <input
                    type="text"
                    value={formRR}
                    onChange={(e) => setFormRR(e.target.value)}
                    placeholder="1:2.0"
                    className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color Theme</label>
                  <select
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="cyan">Cyan</option>
                    <option value="emerald">Emerald</option>
                    <option value="purple">Purple</option>
                    <option value="amber">Amber</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Rules & Confluence Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe entry conditions, liquidity sweep, stop placement..."
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                >
                  {editingStrategy ? 'Update Strategy' : 'Save Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestView;
