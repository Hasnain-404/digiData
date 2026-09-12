import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

// Helper to normalize dates from Excel (handles JS Date, serial numbers, strings like 01.03.2023, 01-03-2023, 2026-08-31)
function parseExcelDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number') {
    // Excel serial date code
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();

  // Standard ISO format: YYYY-MM-DD or YYYY.MM.DD
  const isoMatch = str.match(/^(\d{4})[\.\-](\d{1,2})[\.\-](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // European dot format: DD.MM.YYYY or DD-MM-YYYY (e.g., 02-03-2026)
  const dotMatch = str.match(/^(\d{1,2})[\.\-](\d{1,2})[\.\-](\d{4})$/);
  if (dotMatch) {
    const d = String(parseInt(dotMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(dotMatch[2], 10)).padStart(2, '0');
    const y = dotMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Slash format: DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    const y = slashMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

// Helper to normalize time to HH:MM format
function parseExcelTime(val) {
  if (!val) return '12:00';
  if (typeof val === 'number') {
    // Fraction of a day in Excel (e.g. 0.5 = 12:00)
    const totalMinutes = Math.round(val * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const str = String(val).trim();
  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
    const m = timeMatch[2];
    return `${h}:${m}`;
  }
  return '12:00';
}

// Helper to process image URLs (converts Google Drive share links to direct view URLs if needed)
function formatImageUrl(urlStr) {
  if (!urlStr) return '';
  let str = String(urlStr).trim();
  if (str.includes('drive.google.com') && str.includes('/file/d/')) {
    const match = str.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return str;
}

// Universal trade parser for key-value row objects
function parseTradeFromRowObj(rowObj, idx) {
  const keys = Object.keys(rowObj);

  const getVal = (...aliases) => {
    // 1. Exact match first
    for (const alias of aliases) {
      const cleanA = alias.trim().toLowerCase();
      const exactKey = keys.find((k) => k.trim().toLowerCase() === cleanA);
      if (exactKey !== undefined && rowObj[exactKey] !== undefined && rowObj[exactKey] !== '') {
        return rowObj[exactKey];
      }
    }
    // 2. Phrase match second (skip single character aliases like 'r' to avoid matching 'drawdown' or 'year')
    for (const alias of aliases) {
      const cleanA = alias.trim().toLowerCase();
      if (cleanA.length < 2) continue;
      const partialKey = keys.find((k) => k.trim().toLowerCase().includes(cleanA));
      if (partialKey !== undefined && rowObj[partialKey] !== undefined && rowObj[partialKey] !== '') {
        return rowObj[partialKey];
      }
    }
    return undefined;
  };

  const rawPair = getVal('pair', 'symbol', 'currency', 'asset');
  if (!rawPair) return null;

  const pairStr = String(rawPair).trim().toUpperCase();
  // Filter out header titles or empty values
  if (!pairStr || pairStr === 'PAIR' || pairStr === 'SYMBOL' || pairStr === 'CURRENCY' || pairStr === '#') {
    return null;
  }

  const rawDate = getVal('date', 'day', 'timestamp');
  const date = parseExcelDate(rawDate);

  const rawTime = getVal('time', 'utc', 'entry time');
  const time = parseExcelTime(rawTime);

  const profitRVal = getVal('profit r', 'profitr', 'r-multiple', 'r multiple', 'r', 'pnl r');
  const profitR = profitRVal !== undefined && profitRVal !== '' ? parseFloat(profitRVal) : 0;

  const accBalVal = getVal('account balance', 'balance', 'account', 'acc balance');
  let accountBalance = 10000;
  if (accBalVal !== undefined && accBalVal !== '') {
    const parsedBal = parseFloat(String(accBalVal).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(parsedBal)) accountBalance = parsedBal;
  }

  // Read Risk $ per position directly from Excel Column N (fixed dollar risk per trade)
  let riskDollar = null;
  const riskDollarColVal = getVal('risk $ per position', 'risk$ per position', 'risk $ per trade', 'risk per position', 'risk$');
  if (riskDollarColVal !== undefined && riskDollarColVal !== '') {
    const parsedRD = parseFloat(String(riskDollarColVal).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(parsedRD) && parsedRD > 0) riskDollar = parsedRD;
  }

  let riskPercent = 1;
  let riskPctVal = getVal('risk %', 'riskpercent', 'risk pct');

  if (riskPctVal !== undefined && riskPctVal !== '') {
    const num = parseFloat(String(riskPctVal).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(num)) {
      riskPercent = num < 0.1 && num > 0 ? num * 100 : num;
    }
  } else if (riskDollar !== null && accountBalance > 0) {
    // Reverse-calculate % only for display/storage, but riskDollar is the authoritative value
    riskPercent = (riskDollar / accountBalance) * 100;
  }

  riskPercent = Number(riskPercent.toFixed(3));

  let rawResult = (getVal('trade result', 'result', 'outcome', 'status', 'tp/sl') || '').toString().trim().toUpperCase();
  let result = 'TP';
  if (rawResult.includes('SL') || rawResult.includes('LOSS') || profitR < 0) {
    result = 'SL';
  } else if (rawResult.includes('BE') || rawResult.includes('BREAK') || profitR === 0) {
    result = 'BE';
  }

  let rawDirection = (getVal('entry type', 'entrytype', 'direction', 'type', 'side') || '').toString().trim().toLowerCase();
  let entryType = 'Long';
  if (rawDirection.includes('short') || rawDirection.includes('sell')) {
    entryType = 'Short';
  }

  const rawImageUrl = getVal('trade image (url)', 'trade image(url)', 'trade image', 'image url', 'image', 'chart', 'url', 'screenshot');
  const imageUrl = formatImageUrl(rawImageUrl);

  const notes = (getVal('notes', 'comments', 'remark', 'description') || '').toString().trim();

  const rawNum = rowObj['#'] !== undefined && rowObj['#'] !== '' ? rowObj['#'] : getVal('#', 'trade #', 'trade number', 'num');
  let tradeNumber = null;
  if (rawNum !== undefined && rawNum !== '') {
    const p = parseInt(String(rawNum).trim(), 10);
    if (!isNaN(p)) tradeNumber = p;
  }

  return {
    id: idx,
    ...(tradeNumber !== null ? { tradeNumber } : {}),
    pair: pairStr,
    date,
    time,
    profitR: isNaN(profitR) ? 0 : profitR,
    riskPercent: isNaN(riskPercent) ? 1 : riskPercent,
    // Pass riskDollar directly if read from Column N so backend won't recalculate it
    ...(riskDollar !== null ? { riskDollar } : {}),
    accountBalance: isNaN(accountBalance) ? 10000 : accountBalance,
    result,
    entryType,
    imageUrl,
    notes,
  };
}

const ExcelImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [parsedTrades, setParsedTrades] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Multi-Strategy Excel Parser
  const handleFileUpload = (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        let mapped = [];

        // Strategy 1: Object row parsing
        const rawObjects = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawObjects && rawObjects.length > 0) {
          rawObjects.forEach((obj, idx) => {
            const parsed = parseTradeFromRowObj(obj, idx);
            if (parsed) mapped.push(parsed);
          });
        }

        // Strategy 2: 2D array parsing with dynamic header row detection (if Strategy 1 finds 0 trades)
        if (mapped.length === 0) {
          const rows2D = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (rows2D && rows2D.length > 0) {
            let headerRowIndex = rows2D.findIndex((row) =>
              Array.isArray(row) &&
              row.some((cell) => {
                const cellStr = String(cell).trim().toUpperCase();
                return cellStr === 'PAIR' || cellStr === 'SYMBOL' || cellStr === 'CURRENCY' || cellStr === 'TRADE RESULT' || cellStr === 'PROFIT R';
              })
            );

            if (headerRowIndex !== -1) {
              const headers = rows2D[headerRowIndex].map((h) => String(h).trim());
              const dataRows = rows2D.slice(headerRowIndex + 1);

              dataRows.forEach((rowArr, idx) => {
                if (!Array.isArray(rowArr)) return;
                const rowObj = {};
                headers.forEach((h, colIdx) => {
                  if (h) rowObj[h] = rowArr[colIdx];
                });
                const parsed = parseTradeFromRowObj(rowObj, idx);
                if (parsed) mapped.push(parsed);
              });
            }
          }
        }

        if (mapped.length === 0) {
          toast.error('Could not find valid trade rows in the sheet. Please verify column headers.');
          return;
        }

        // Re-index cleanly
        mapped = mapped.map((t, index) => ({ ...t, id: index }));

        setParsedTrades(mapped);
        toast.success(`Successfully scraped ${mapped.length} trades from Excel sheet! 🎉`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const removeTrade = (id) => {
    setParsedTrades((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePostToServer = async () => {
    if (parsedTrades.length === 0) {
      toast.error('No trade rows to upload');
      return;
    }

    setIsUploading(true);
    try {
      const payload = parsedTrades.map(({ id, ...trade }) => trade);

      // Use /sync instead of /bulk — smart duplicate filter by date+time
      const response = await fetch(`${API_BASE}/trades/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (resData.success) {
        const inserted = resData.inserted ?? 0;
        const skipped = resData.skipped ?? 0;

        if (resData.duplicates && resData.duplicates.length > 0) {
          console.log('📋 Skipped duplicate trades report:', resData.duplicates);
        }

        if (inserted > 0 && skipped === 0) {
          toast.success(`✅ ${inserted} new trade${inserted > 1 ? 's' : ''} synced successfully! 🚀`);
          setFile(null);
          setParsedTrades([]);
          setSyncResult(null);
          onSuccess?.();
          onClose();
        } else if (skipped > 0) {
          setSyncResult(resData);
          if (inserted > 0) {
            toast.success(
              `✅ ${inserted} new trade${inserted > 1 ? 's' : ''} added\n⚠️ ${skipped} duplicate trade${skipped > 1 ? 's' : ''} skipped (see report below)`,
              { duration: 5000 }
            );
            onSuccess?.();
          } else {
            toast(`⚠️ All ${skipped} trade${skipped > 1 ? 's' : ''} already exist in database — see report below.`, {
              icon: '⚠️',
              duration: 5000,
            });
          }
        }
      } else {
        toast.error(resData.message || 'Failed to sync trades to server');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during sync. Is the server running?');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportFromServer = async () => {
    try {
      toast.loading('Preparing Excel export...');
      const response = await fetch(`${API_BASE}/trades/export`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Trading_Journal_Export.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('Excel exported successfully! 🎉');
    } catch (err) {
      toast.dismiss();
      toast.error('Export failed. Is the server running?');
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        PAIR: 'XAUUSD',
        Time: '00:00',
        Date: '01-03-2023',
        'Profit R': 2,
        'Risk %': '1%',
        'Account balance': 10000,
        'Trade Result': 'TP',
        'Entry Type': 'Short',
        'Trade Image (url)': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      },
      {
        PAIR: 'USDJPY',
        Time: '14:30',
        Date: '02-03-2023',
        'Profit R': -1,
        'Risk %': '1%',
        'Account balance': 10200,
        'Trade Result': 'SL',
        'Entry Type': 'Short',
        'Trade Image (url)': 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trading Journal');
    XLSX.writeFile(wb, 'Trading_Journal_Sheet.xlsx');
    toast.success('Sample Excel template matching your sheet downloaded!');
  };

  return (
    <div className="modal-backdrop z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-4xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-up flex flex-col max-h-[90vh]">
        {/* Top Accent Line */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              <i className="ri-file-excel-2-line" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Import &amp; Scrape Excel Sheet
              </h2>
              <p className="text-xs text-slate-400">
                Auto-extract trades &amp; Image URLs from Excel sheet format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-all"
            >
              <i className="ri-download-2-line text-emerald-400" />
              Template
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Dropzone */}
          {parsedTrades.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${dragActive
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-1">
                <i className="ri-upload-cloud-2-line" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Click to browse or drag &amp; drop your Excel file here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, and .csv formats
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all mt-2">
                <i className="ri-file-search-line" /> Select Excel File
              </span>
            </div>
          ) : (
            /* Scraped Data Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-sm">
                  <i className="ri-checkbox-circle-line text-emerald-400 text-lg" />
                  <span className="font-semibold text-slate-200">
                    File Scraped: <span className="text-emerald-400">{file?.name}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {parsedTrades.length} trades detected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setParsedTrades([]);
                      setFile(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 transition-colors"
                  >
                    <i className="ri-refresh-line" /> Re-upload
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full data-table text-xs">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">Pair</th>
                      <th className="text-left">Date</th>
                      <th className="text-left">Time</th>
                      <th className="text-left">Profit R</th>
                      <th className="text-left">Result</th>
                      <th className="text-left">Direction</th>
                      <th className="text-left">Risk %</th>
                      <th className="text-left">Balance</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="text-slate-500">{idx + 1}</td>
                        <td className="font-bold text-emerald-400">{t.pair}</td>
                        <td className="text-slate-300">
                          {(() => {
                            if (!t.date) return '—';
                            const parts = t.date.split('-');
                            if (parts.length === 3) {
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const d = parseInt(parts[2], 10);
                              const m = parseInt(parts[1], 10) - 1;
                              const y = parts[0];
                              if (!isNaN(d) && !isNaN(m)) return `${d} ${months[m]} ${y}`;
                            }
                            return t.date;
                          })()}
                        </td>
                        <td className="text-slate-400 font-mono-nums">{t.time}</td>
                        <td className={`font-bold font-mono-nums ${t.profitR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.profitR >= 0 ? '+' : ''}{t.profitR}R
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.result === 'TP' ? 'badge-tp' : t.result === 'SL' ? 'badge-sl' : 'badge-be'
                            }`}>
                            {t.result}
                          </span>
                        </td>
                        <td>
                          <span className={`font-semibold ${t.entryType === 'Long' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.entryType}
                          </span>
                        </td>
                        <td className="text-slate-300">{t.riskPercent}%</td>
                        <td className="text-slate-300 font-mono-nums">${t.accountBalance}</td>
                        <td className="text-center">
                          <button
                            onClick={() => removeTrade(t.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            title="Remove row"
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Duplicate Trades Log & Report */}
              {syncResult && syncResult.duplicates && syncResult.duplicates.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <i className="ri-error-warning-fill text-amber-400 text-sm" />
                      <span>{syncResult.skipped} Duplicate Trade{syncResult.skipped > 1 ? 's' : ''} Skipped</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                      {syncResult.inserted} New Trades Synced
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    The following trades were detected as already existing in the database with identical date, time, pair, profit R, and result:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {syncResult.duplicates.map((dup, dIdx) => (
                      <div key={dIdx} className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300 font-mono">{dup.pair}</span>
                          <span className="text-slate-400">{dup.date}</span>
                          <span className="text-slate-500 font-mono-nums">{dup.time}</span>
                          {dup.profitR !== undefined && (
                            <span className={`font-bold font-mono-nums ${dup.profitR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {dup.profitR >= 0 ? '+' : ''}{dup.profitR}R
                            </span>
                          )}
                          {dup.result && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dup.result === 'TP' ? 'badge-tp' : dup.result === 'SL' ? 'badge-sl' : 'badge-be'
                              }`}>
                              {dup.result}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-amber-400/80 italic">
                          {dup.reason || 'Already exists'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0d1117]">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <i className="ri-shield-check-line text-emerald-400" />
            Smart sync: only exact duplicate trades are skipped. Multiple trades at the same time are fully supported!
          </span>
          <div className="flex items-center gap-3">
            {/* Export all from DB to Excel */}
            <button
              onClick={handleExportFromServer}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 transition-all"
            >
              <i className="ri-file-excel-2-line" />
              Export All
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePostToServer}
              disabled={parsedTrades.length === 0 || isUploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-sm" />
                  Syncing Trades...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-fill text-sm" />
                  Sync {parsedTrades.length > 0 ? `(${parsedTrades.length})` : ''} to Server
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
