import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

// ── Session detection (mirrors backend logic) ─────────────────────────────────
function detectSession(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + (m || 0);

  if (totalMin >= 19 * 60 || totalMin === 0) return 'Asian';
  if (totalMin >= 3 * 60 && totalMin <= 6 * 60) return 'London';
  if (totalMin >= 8 * 60 && totalMin <= 11 * 60) return 'New York';

  return 'Off-Hours';
}

const SESSION_COLORS = {
  Asian: 'text-violet-400',
  London: 'text-blue-400',
  'New York': 'text-amber-400',
  'Off-Hours': 'text-slate-400',
};

const INITIAL_FORM = {
  pair: '',
  time: '',
  date: new Date().toISOString().split('T')[0],
  profitR: '',
  riskPercent: '',
  riskDollar: '',
  accountBalance: '',
  result: 'TP',
  entryType: 'Long',
  imageUrl: '',
  notes: '',
};

const InputField = ({ label, id, type = 'text', placeholder, value, onChange, required, className = '', children }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children || (
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all input-glow"
      />
    )}
  </div>
);

const TradeModalForm = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [session, setSession] = useState('');
  const [riskDollarAuto, setRiskDollarAuto] = useState(null); // auto-calculated value
  const [riskDollarManual, setRiskDollarManual] = useState(false); // true = user typed their own
  const [submitting, setSubmitting] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const modalRef = useRef(null);

  // Auto-fetch previous trade account balance when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsEditingBalance(false);

    const fetchPrevBalance = async () => {
      setFetchingBalance(true);
      try {
        const res = await fetch(`${API_BASE}/trades?limit=1&sortBy=date&order=desc`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const lastBal = data.data[0].accountBalance;
          if (isMounted && lastBal != null) {
            setForm((f) => ({ ...f, accountBalance: lastBal }));
            setFetchingBalance(false);
            return;
          }
        }

        const kpiRes = await fetch(`${API_BASE}/analytics/kpis`);
        const kpiData = await kpiRes.json();
        if (kpiData.success && kpiData.data) {
          const bal = kpiData.data.currentBalance || kpiData.data.startingBalance;
          if (isMounted && bal != null && bal > 0) {
            setForm((f) => ({ ...f, accountBalance: bal }));
            setFetchingBalance(false);
            return;
          }
        }
      } catch (err) {
        // Ignore network errors in demo/offline mode
      }

      if (isMounted) setFetchingBalance(false);
    };

    fetchPrevBalance();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Auto-detect session from time
  useEffect(() => {
    if (form.time) setSession(detectSession(form.time));
    else setSession('');
  }, [form.time]);

  // Auto-calculate Risk $ — only write to form if user hasn't manually overridden it
  useEffect(() => {
    const bal = parseFloat(form.accountBalance);
    const risk = parseFloat(form.riskPercent);
    if (!isNaN(bal) && !isNaN(risk) && bal > 0 && risk > 0) {
      const calc = ((bal * risk) / 100).toFixed(2);
      setRiskDollarAuto(calc);
      if (!riskDollarManual) {
        setForm((f) => ({ ...f, riskDollar: calc }));
      }
    } else {
      setRiskDollarAuto(null);
      if (!riskDollarManual) {
        setForm((f) => ({ ...f, riskDollar: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountBalance, form.riskPercent, riskDollarManual]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          profitR: parseFloat(form.profitR),
          riskPercent: parseFloat(form.riskPercent),
          accountBalance: parseFloat(form.accountBalance),
          riskDollar: form.riskDollar !== '' ? parseFloat(form.riskDollar) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Trade logged successfully! 🎯');
        setForm(INITIAL_FORM);
        setSession('');
        setRiskDollarAuto(null);
        setRiskDollarManual(false);
        setIsEditingBalance(false);
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.message || 'Failed to log trade');
      }
    } catch (err) {
      toast.error('Server error. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl mx-4 bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 animate-slide-in-up overflow-hidden"
      >
        {/* Header gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">New Journal Entry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Log your trade details below</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Row 1: Pair, Date, Time */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <InputField label="Pair" id="pair" placeholder="EURUSD" value={form.pair} onChange={set('pair')} required />
            <InputField label="Date" id="date" type="date" value={form.date} onChange={set('date')} required />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="time" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Time (UTC) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={set('time')}
                  required
                  className="w-full h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all input-glow"
                />
                {session && (
                  <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${SESSION_COLORS[session] || 'text-slate-400'}`}>
                    {session}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Account Balance (auto-fetched), Risk %, Risk $ (auto) */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Account Balance ($)
                </label>
                <div className="flex items-center gap-1.5">
                  {!isEditingBalance && form.accountBalance !== '' && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBalance(true)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 underline transition-colors"
                      title="Click to override auto-fetched balance"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditingBalance ? (
                <input
                  id="accountBalance"
                  type="number"
                  placeholder="10000"
                  value={form.accountBalance}
                  onChange={set('accountBalance')}
                  className="h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all input-glow"
                />
              ) : (
                <div className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-sm flex items-center justify-between">
                  {fetchingBalance ? (
                    <span className="text-slate-500 italic flex items-center gap-1.5 text-xs">
                      <svg className="w-3 h-3 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Fetching...
                    </span>
                  ) : form.accountBalance !== '' ? (
                    <span className="text-emerald-400 font-semibold font-mono-nums">
                      ${Number(form.accountBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-600 italic">No previous balance</span>
                  )}
                </div>
              )}
            </div>

            <InputField label="Risk %" id="riskPercent" type="number" placeholder="1.0" value={form.riskPercent} onChange={set('riskPercent')} required />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Risk $</label>
                {!riskDollarManual && riskDollarAuto && (
                  <span className="text-[10px] text-cyan-500 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded">auto</span>
                )}
                {riskDollarManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setRiskDollarManual(false);
                      setForm((f) => ({ ...f, riskDollar: riskDollarAuto || '' }));
                    }}
                    className="text-[10px] text-slate-500 hover:text-cyan-400 underline transition-colors"
                  >
                    Reset to auto
                  </button>
                )}
              </div>
              <input
                id="riskDollar"
                type="number"
                placeholder={riskDollarAuto ? riskDollarAuto : 'e.g. 50'}
                value={form.riskDollar}
                onChange={(e) => {
                  const val = e.target.value;
                  setRiskDollarManual(val !== '');
                  setForm((f) => ({ ...f, riskDollar: val }));
                }}
                className={`h-9 px-3 rounded-lg bg-slate-800/80 border text-sm text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all input-glow ${riskDollarManual
                  ? 'border-amber-500/60 focus:border-amber-400'
                  : 'border-slate-700 focus:border-blue-500'
                  }`}
              />
            </div>
          </div>

          {/* Row 3: Profit R, Result, Entry Type */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <InputField label="Profit R" id="profitR" type="number" placeholder="+2.5 or -1" value={form.profitR} onChange={set('profitR')} required />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Result <span className="text-rose-500">*</span></label>
              <div className="flex gap-1.5 h-9">
                {['TP', 'SL', 'BE'].map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setForm((f) => ({ ...f, result: r }))}
                    className={`flex-1 rounded-lg text-sm font-semibold border transition-all ${form.result === r
                      ? r === 'TP' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : r === 'SL' ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                          : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Entry Type <span className="text-rose-500">*</span></label>
              <div className="flex gap-1.5 h-9">
                {['Long', 'Short'].map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, entryType: t }))}
                    className={`flex-1 rounded-lg text-sm font-semibold border transition-all ${form.entryType === t
                      ? t === 'Long' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                  >
                    {t === 'Long' ? '↑ Long' : '↓ Short'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Session (read-only), Image URL */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Session (auto-detected)</label>
              <div className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-sm flex items-center gap-2">
                {session ? (
                  <>
                    <span className={`w-2 h-2 rounded-full ${session === 'Asian' ? 'bg-violet-400' :
                      session === 'London' ? 'bg-blue-400' :
                        session === 'New York' ? 'bg-amber-400' : 'bg-slate-500'
                      }`} />
                    <span className={`font-semibold ${SESSION_COLORS[session]}`}>{session}</span>
                  </>
                ) : (
                  <span className="text-slate-600 italic">Enter time above</span>
                )}
              </div>
            </div>
            <InputField label="Trade Image (URL)" id="imageUrl" type="url" placeholder="https://..." value={form.imageUrl} onChange={set('imageUrl')} />
          </div>

          {/* Live Chart Image Preview */}
          {form.imageUrl && (
            <div className="mb-4 p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <i className="ri-image-line text-emerald-400" /> Chart Preview
              </span>
              <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-700/50 bg-black/40">
                <img
                  src={form.imageUrl}
                  alt="Chart preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div class="h-full flex items-center justify-center text-xs text-slate-500">Preview link output ready</div>`;
                  }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5 mb-5">
            <label htmlFor="notes" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Notes</label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Setup description, observations..."
              value={form.notes}
              onChange={set('notes')}
              className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all resize-none input-glow"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="btn-submit-trade"
              className="flex-1 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold shadow-lg hover:from-blue-500 hover:to-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging Trade...
                </span>
              ) : 'Log Trade 🎯'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeModalForm;
