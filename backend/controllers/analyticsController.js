import Trade from '../models/Trade.js';

const calculateWinRate = (wins, losses) => {
  const decisiveTrades = wins + losses;
  return decisiveTrades > 0 ? (wins / decisiveTrades) * 100 : 0;
};

// ─── GET /api/v1/analytics/kpis ──────────────────────────────────────────────
export const getKPIs = async (req, res) => {
  try {
    const trades = await Trade.find().sort({ date: 1 }).lean();

    if (!trades.length) {
      return res.json({
        success: true,
        data: {
          totalR: 0, winRate: 0, totalTrades: 0, totalWins: 0, totalLosses: 0,
          totalDollarGain: 0, startingBalance: 0, currentBalance: 0,
          maxDrawdownPercent: 0, maxWinStreak: 0, maxLossStreak: 0,
        },
      });
    }

    const wins = trades.filter((t) => t.result === 'TP');
    const losses = trades.filter((t) => t.result === 'SL');

    const totalR = trades.reduce((sum, t) => sum + (t.profitR || 0), 0);
    const winRate = calculateWinRate(wins.length, losses.length);

    // Find the first trade with a valid accountBalance for starting balance calc
    const firstTrade = trades[0];
    const firstTradePnl =
      firstTrade.result === 'TP'
        ? (firstTrade.riskDollar || 0) * (firstTrade.profitR || 1)
        : firstTrade.result === 'SL'
          ? -(firstTrade.riskDollar || 0)
          : 0;

    // Round to nearest 50 multiplier (e.g. $4,998 -> $5,000 exact starting capital)
    const rawStarting = (firstTrade.accountBalance || 0) - firstTradePnl;
    const startingBalance = Math.round(rawStarting / 50) * 50;

    // Find last trade with a defined accountBalance (some may be undefined if not in sheet)
    let currentBalance = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].accountBalance != null && !isNaN(trades[i].accountBalance)) {
        currentBalance = trades[i].accountBalance;
        break;
      }
    }

    const totalDollarGain = currentBalance - startingBalance;

    // Max Drawdown % — peak-to-trough on running account balance (skip undefined)
    let peak = startingBalance;
    let maxDrawdown = 0;
    trades.forEach((t) => {
      const bal = t.accountBalance;
      if (bal == null || isNaN(bal)) return; // skip trades without a balance
      if (bal > peak) peak = bal;
      const drawdown = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Max Win / Loss Streaks
    let maxWinStreak = 0, maxLossStreak = 0;
    let curWin = 0, curLoss = 0;
    trades.forEach((t) => {
      if (t.result === 'TP') {
        curWin++; curLoss = 0;
        if (curWin > maxWinStreak) maxWinStreak = curWin;
      } else if (t.result === 'SL') {
        curLoss++; curWin = 0;
        if (curLoss > maxLossStreak) maxLossStreak = curLoss;
      } else {
        curWin = 0; curLoss = 0;
      }
    });

    res.json({
      success: true,
      data: {
        totalR: parseFloat(totalR.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        totalTrades: trades.length,
        totalWins: wins.length,
        totalLosses: losses.length,
        totalDollarGain: parseFloat(totalDollarGain.toFixed(2)),
        startingBalance: parseFloat(startingBalance.toFixed(2)),
        currentBalance: parseFloat(currentBalance.toFixed(2)),
        maxDrawdownPercent: parseFloat(maxDrawdown.toFixed(2)),
        maxWinStreak,
        maxLossStreak,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── GET /api/v1/analytics/best-bad-days ─────────────────────────────────────
export const getBestBadDays = async (req, res) => {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const result = await Trade.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$date' },
          totalR: { $sum: '$profitR' },
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'TP'] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$result', 'SL'] }, 1, 0] } },
          be: { $sum: { $cond: [{ $eq: ['$result', 'BE'] }, 1, 0] } },
        },
      },
    ]);

    const mapped = result
      .map((d) => ({
        day: dayNames[d._id - 1],
        totalR: parseFloat(d.totalR.toFixed(2)),
        totalTrades: d.totalTrades,
        wins: d.wins,
        losses: d.losses,
        be: d.be,
        winRate: d.totalTrades > 0 ? parseFloat(((d.wins / d.totalTrades) * 100).toFixed(1)) : 0,
      }))
      .filter((d) => orderedDays.includes(d.day));

    // Sort by Total R descending
    const sortedByR = [...mapped].sort((a, b) => b.totalR - a.totalR);
    const bestDays = sortedByR.slice(0, 2);
    const badDays = [...sortedByR].reverse().slice(0, 2);

    res.json({
      success: true,
      data: {
        bestDays,
        badDays,
        bestDayText: bestDays.map((d) => d.day).join(', '),
        badDayText: badDays.map((d) => d.day).join(', '),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/analytics/weekday-breakdown ─────────────────────────────────
export const getWeekdayBreakdown = async (req, res) => {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const result = await Trade.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$date' },
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'TP'] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$result', 'SL'] }, 1, 0] } },
          be: { $sum: { $cond: [{ $eq: ['$result', 'BE'] }, 1, 0] } },
          totalR: { $sum: '$profitR' },
        },
      },
    ]);

    const mapped = result.map((d) => ({
      day: dayNames[d._id - 1],
      totalTrades: d.totalTrades,
      wins: d.wins,
      losses: d.losses,
      be: d.be,
      // In Excel: Win Rate (%) = Wins / Total Trades
      winRate: d.totalTrades > 0 ? parseFloat(((d.wins / d.totalTrades) * 100).toFixed(1)) : 0,
      totalR: parseFloat(d.totalR.toFixed(2)),
    }));

    // Sort Mon–Fri, fill empty days
    const sorted = orderedDays.map(
      (day) =>
        mapped.find((d) => d.day === day) || {
          day, totalTrades: 0, wins: 0, losses: 0, be: 0, winRate: 0, totalR: 0,
        }
    );

    res.json({ success: true, data: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/analytics/weekly-pnl ────────────────────────────────────────
// Returns weeks grouped by month, each with weekOfMonth number.
// Response shape: { monthYear: "August 2026", weeks: [...], monthTotal, monthTrades }
export const getWeeklyPnl = async (req, res) => {
  try {
    const trades = await Trade.find().sort({ date: 1 }).lean();

    if (!trades.length) return res.json({ success: true, data: [] });

    // Step 1: Group trades by calendar month + week-of-month
    // Week-of-month = ceil(day / 7) so week 1 = days 1-7, week 2 = 8-14, etc.
    const monthWeekMap = {}; // key: "2026-07" → { weekMap: { 1: {...}, 2: {...} } }

    trades.forEach((t) => {
      const d = new Date(t.date);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      const day = d.getDate();
      const firstDayOfMonth = new Date(year, month, 1);
      const firstDayMonOffset = (firstDayOfMonth.getDay() + 6) % 7;
      const weekOfMonth = Math.floor((day - 1 + firstDayMonOffset) / 7) + 1;

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthWeekMap[monthKey]) {
        monthWeekMap[monthKey] = {
          year,
          month,
          monthYear: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          weekMap: {},
        };
      }

      const wm = monthWeekMap[monthKey].weekMap;
      if (!wm[weekOfMonth]) {
        wm[weekOfMonth] = { weekOfMonth, dollarPnl: 0, totalR: 0, trades: 0, wins: 0 };
      }

      const pnl =
        t.result === 'TP'
          ? (t.riskDollar || 0) * (t.profitR || 1)
          : t.result === 'SL'
            ? -(t.riskDollar || 0)
            : 0;

      wm[weekOfMonth].dollarPnl += pnl;
      wm[weekOfMonth].totalR += t.profitR || 0;
      wm[weekOfMonth].trades += 1;
      if (t.result === 'TP') wm[weekOfMonth].wins += 1;
    });

    // Step 2: Build sorted array of months with their weeks
    const result = Object.keys(monthWeekMap)
      .sort()
      .map((mk) => {
        const m = monthWeekMap[mk];
        const weeks = Object.values(m.weekMap)
          .sort((a, b) => a.weekOfMonth - b.weekOfMonth)
          .map((w) => ({
            weekOfMonth: w.weekOfMonth,
            dollarPnl: parseFloat(w.dollarPnl.toFixed(2)),
            totalR: parseFloat(w.totalR.toFixed(2)),
            trades: w.trades,
            wins: w.wins,
          }));

        const monthTotal = parseFloat(weeks.reduce((s, w) => s + w.dollarPnl, 0).toFixed(2));
        const monthR = parseFloat(weeks.reduce((s, w) => s + w.totalR, 0).toFixed(2));
        const monthTrades = weeks.reduce((s, w) => s + w.trades, 0);

        return {
          monthKey: mk,
          monthYear: m.monthYear,
          weeks,
          monthTotal,
          monthR,
          monthTrades,
        };
      });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/analytics/monthly-returns ────────────────────────────────────
export const getMonthlyReturns = async (req, res) => {
  try {
    const trades = await Trade.find().sort({ date: 1 }).lean();

    if (!trades.length) return res.json({ success: true, data: [] });

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build year → month map
    const yearMonthMap = {};
    trades.forEach((t) => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth(); // 0-indexed

      if (!yearMonthMap[y]) yearMonthMap[y] = {};
      if (!yearMonthMap[y][m]) yearMonthMap[y][m] = { dollarPnl: 0, trades: 0, wins: 0 };

      const pnl =
        t.result === 'TP'
          ? (t.riskDollar || 0) * (t.profitR || 1)
          : t.result === 'SL'
            ? -(t.riskDollar || 0)
            : 0;

      yearMonthMap[y][m].dollarPnl += pnl;
      yearMonthMap[y][m].trades += 1;
      if (t.result === 'TP') yearMonthMap[y][m].wins += 1;
    });

    // Need starting balance to calculate % per month
    const firstTrade = trades[0];
    const firstTradePnl =
      firstTrade.result === 'TP'
        ? (firstTrade.riskDollar || 0) * (firstTrade.profitR || 1)
        : firstTrade.result === 'SL'
          ? -(firstTrade.riskDollar || 0)
          : 0;
    const rawStarting = (firstTrade.accountBalance || 5000) - firstTradePnl;
    const startingBalance = (rawStarting > 0) ? Math.round(rawStarting / 50) * 50 : 5000;

    const matrix = Object.keys(yearMonthMap)
      .sort()
      .map((year) => {
        const months = MONTHS.map((month, idx) => {
          const cell = yearMonthMap[year][idx];
          if (!cell) return { month, pct: 0, amount: 0, trades: 0 };
          const pnlVal = typeof cell.dollarPnl === 'number' && !isNaN(cell.dollarPnl) ? cell.dollarPnl : 0;
          const pctVal = startingBalance > 0 ? parseFloat(((pnlVal / startingBalance) * 100).toFixed(2)) : 0;
          return {
            month,
            pct: isNaN(pctVal) ? 0 : pctVal,
            amount: parseFloat(pnlVal.toFixed(2)),
            trades: cell.trades,
          };
        });

        const ytdAmount = months.reduce((s, m) => s + (m.amount || 0), 0);
        const ytdTrades = months.reduce((s, m) => s + (m.trades || 0), 0);
        const rawYtdPct = startingBalance > 0 ? parseFloat(((ytdAmount / startingBalance) * 100).toFixed(2)) : 0;
        const ytdPct = isNaN(rawYtdPct) ? 0 : rawYtdPct;

        return {
          year: parseInt(year),
          months,
          ytdPct,
          ytdAmount: parseFloat(ytdAmount.toFixed(2)),
          ytdTrades,
        };
      });

    res.json({ success: true, data: matrix });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
