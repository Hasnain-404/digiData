import dotenv from 'dotenv';
dotenv.config();

// ── Same normalizers as in tradeController.js ──────────────────────────────
function normalizeGasTime(raw) {
  const s = String(raw || '12:00').trim();

  // Full Date string from old GAS → parse and use UTC hours/minutes
  if (s.includes('GMT')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
  }

  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  return '12:00';
}

function normalizeGasDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.includes('GMT')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return s;
}

// ── Fetch all trades from Google Sheet ─────────────────────────────────────
console.log('📥 Fetching trades from Google Sheet...');
const response = await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL);
const data = await response.json();

if (!data.success || !Array.isArray(data.trades)) {
  console.error('❌ Failed to fetch trades:', data);
  process.exit(1);
}

console.log(`✅ Got ${data.trades.length} trades. Showing first 5 time conversions:\n`);

data.trades.slice(0, 5).forEach(t => {
  const fixed = normalizeGasTime(t.time);
  const fixedDate = normalizeGasDate(t.date);
  console.log(`Trade #${t.tradeNumber}: ${t.pair} | time: "${String(t.time).substring(0,20)}" → "${fixed}" | date: "${fixedDate}"`);
});

console.log('\nNow triggering full sync via local backend...');

// ── Hit the local backend sync endpoint ────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

const syncRes = await fetch('http://localhost:5000/api/v1/trades/sync-google-sheet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-pin': ADMIN_PIN,
  },
});

const syncData = await syncRes.json();
console.log('\n📊 Sync result:');
console.log(`   Inserted: ${syncData.inserted}`);
console.log(`   Updated:  ${syncData.updated}`);
console.log(`   Deleted:  ${syncData.deleted}`);
console.log(`   Total:    ${syncData.total}`);
console.log(`   Message:  ${syncData.message}`);

process.exit(0);
