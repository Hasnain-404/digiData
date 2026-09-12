import mongoose from 'mongoose';

// Session detection based on custom user time windows:
// Asian (A):    19:00 – 00:00
// London (L):   03:00 – 06:00
// New York (N): 08:00 – 11:00
export function detectSession(timeStr) {
  if (!timeStr) return 'Off-Hours';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + (m || 0);

  // Asian: 19:00 to 00:00
  if (totalMin >= 19 * 60 || totalMin === 0) return 'Asian';

  // London: 03:00 to 06:00
  if (totalMin >= 3 * 60 && totalMin <= 6 * 60) return 'London';

  // New York: 08:00 to 11:00
  if (totalMin >= 8 * 60 && totalMin <= 11 * 60) return 'New York';

  return 'Off-Hours';
}

const tradeSchema = new mongoose.Schema(
  {
    tradeNumber: {
      type: Number,
      index: true,
    },
    pair: {
      type: String,
      required: [true, 'Currency pair is required'],
      trim: true,
      uppercase: true,
    },
    time: {
      type: String, // HH:MM (UTC)
      required: [true, 'Trade time is required'],
      match: [/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'],
    },
    date: {
      type: Date,
      required: [true, 'Trade date is required'],
    },
    profitR: {
      type: Number, // R-multiple (positive = win, negative = loss)
      required: [true, 'Profit R is required'],
    },
    riskPercent: {
      type: Number, // e.g. 1 for 1%
      required: [true, 'Risk % is required'],
      min: [0, 'Risk % cannot be negative'],
    },
    riskDollar: {
      type: Number, // Fixed $ risk per trade (from Excel Col N), or auto-calculated if not provided
    },
    accountBalance: {
      type: Number,
      required: [true, 'Account balance is required'],
    },
    result: {
      type: String,
      enum: ['TP', 'SL', 'BE'],
      required: [true, 'Trade result is required'],
    },
    entryType: {
      type: String,
      enum: ['Long', 'Short'],
      required: [true, 'Entry type is required'],
    },
    session: {
      type: String,
      enum: ['Asian', 'London', 'New York', 'Off-Hours', 'Unknown'],
      // Auto-assigned by pre-save hook
    },
    imageUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ─── Pre-save Hook: Auto-detect session + Auto-calculate Risk $ ───────────────
tradeSchema.pre('save', async function () {
  // 1. Session detection
  if (this.isModified('time') || !this.session) {
    this.session = detectSession(this.time);
  }
  // 2. Risk Dollar calculation — only auto-calculate if riskDollar was NOT explicitly provided.
  //    This preserves fixed-dollar risk sheets (e.g. always $50/trade from Excel Column N).
  if (!this.riskDollar || this.riskDollar === 0) {
    this.riskDollar = parseFloat(
      ((this.accountBalance * this.riskPercent) / 100).toFixed(2)
    );
  }
});

// ─── Indexes for fast queries ─────────────────────────────────────────────────
tradeSchema.index({ date: 1 });
tradeSchema.index({ session: 1 });
tradeSchema.index({ result: 1 });
// Compound index for duplicate detection: same date+time = same trade
tradeSchema.index({ date: 1, time: 1 });

const Trade = mongoose.model('Trade', tradeSchema);

export default Trade;
