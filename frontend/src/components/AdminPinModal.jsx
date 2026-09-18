import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';

const AdminPinModal = () => {
  const { isPinModalOpen, closePinModal, unlock } = useAdmin();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isPinModalOpen) {
      setPin('');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isPinModalOpen]);

  if (!isPinModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Please enter your Owner PIN');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const res = await unlock(pin.trim());
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || 'Incorrect PIN. Only the owner can make changes.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) closePinModal(); }}
    >
      <div className="relative w-full max-w-sm bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 animate-slide-in-up">
        {/* Close Button */}
        <button
          onClick={closePinModal}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <i className="ri-close-line text-lg" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl mb-3 shadow-lg shadow-cyan-500/10">
            <i className="ri-shield-keyhole-line" />
          </div>
          <h3 className="text-lg font-bold text-white font-sans">Owner Verification</h3>
          <p className="text-xs text-slate-400 mt-1">
            Enter your secret Owner PIN to unlock trade creation, editing, and deletion.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN (e.g. 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-center tracking-widest text-lg font-mono placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg"
            >
              <i className={showPin ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center flex items-center justify-center gap-1.5 animate-shake">
              <i className="ri-error-warning-line text-sm" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={closePinModal}
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {loading ? (
                <i className="ri-loader-4-line animate-spin text-sm" />
              ) : (
                <>
                  <i className="ri-lock-unlock-line text-sm" />
                  <span>Unlock</span>
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Public visitors are in read-only mode and cannot delete or edit data.
        </p>
      </div>
    </div>
  );
};

export default AdminPinModal;
