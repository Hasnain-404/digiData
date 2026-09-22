import React, { useEffect } from 'react';
import { getSafeImageUrl, getProxiedImageUrl } from '../utils/imageUrl';

const LightboxModal = ({ imageUrl, onClose }) => {
  // Disable background scrolling & close on ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!imageUrl) return null;

  const safeUrl = getSafeImageUrl(imageUrl);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in cursor-pointer select-none"
      onClick={onClose}
    >
      {/* Top Right Close Button & Direct Link */}
      <div
        className="absolute top-6 right-6 flex items-center gap-3 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-xl"
        >
          <i className="ri-external-link-line text-cyan-400 text-sm" />
          <span>Open Full Chart</span>
        </a>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-xl text-xl"
          title="Close (Esc)"
        >
          <i className="ri-close-line" />
        </button>
      </div>

      {/* Centered Image Container */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={safeUrl}
          alt="Trade Chart Setup"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80 bg-slate-950"
          onError={(e) => {
            const proxied = getProxiedImageUrl(imageUrl);
            if (e.target.src !== proxied) {
              e.target.src = proxied;
            }
          }}
        />
      </div>

      {/* Hint text at bottom */}
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500 pointer-events-none">
        Click anywhere on the background or press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">Esc</kbd> to close
      </p>
    </div>
  );
};

export default LightboxModal;
