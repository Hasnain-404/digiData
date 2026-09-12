# Excel ↔ Website Sync — Setup Guide

## How it works

```
Your Excel File
      ↓  (detected within 5 seconds of saving)
watcher.py (runs in background)
      ↓  (POST /api/v1/trades/sync)
Backend API (checks date+time duplicates)
      ↓
MongoDB + Website updates
```

And in reverse — when you add a trade on the website, it auto-writes back to your Excel file.

---

## First Time Setup

### 1. Install Python dependencies

```bash
cd excel_sync
pip install -r requirements.txt
```

### 2. Check config.json

Open `config.json` and verify:
- `excel_file_path` — must match your actual Excel file path
- `backend_url` — your backend URL (default: `http://localhost:5000/api/v1`)

### 3. Start the watcher

**Double-click** `start_watcher.bat`  
OR run in terminal:
```bash
python watcher.py
```

---

## Duplicate Detection

The filter uses **Date + Time** together as the unique key:

| Date       | Time  | Result     |
|------------|-------|------------|
| 2026-09-08 | 00:30 | ✅ Inserted |
| 2026-09-08 | 08:45 | ✅ Inserted (same day, different time) |
| 2026-09-08 | 00:30 | ❌ Skipped (exact duplicate) |

---

## Files

| File | Purpose |
|------|---------|
| `watcher.py` | Main watcher script |
| `config.json` | Configuration (file path, server URL) |
| `requirements.txt` | Python packages needed |
| `start_watcher.bat` | Double-click launcher for Windows |
| `synced_hashes.json` | Auto-generated — tracks which trades were already synced |
| `watcher.log` | Auto-generated — full sync history log |

---

## Troubleshooting

**"Cannot reach backend"** → Make sure your backend server is running (`npm run dev` in the backend folder)

**Trades not appearing** → Check `watcher.log` for errors

**Wrong Excel file** → Edit `config.json` and update `excel_file_path`
