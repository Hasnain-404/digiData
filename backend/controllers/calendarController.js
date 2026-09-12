import Trade from '../models/Trade.js';

// ─── GET /api/v1/calendar?month=MM&year=YYYY ─────────────────────────────────
export const getCalendarData = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month);
    const y = parseInt(year);

    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) and year are required',
      });
    }

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 1);

    const trades = await Trade.find({ date: { $gte: start, $lt: end } })
      .sort({ date: 1, time: 1 })
      .lean();

    // Group by date string YYYY-MM-DD
    const grouped = {};
    trades.forEach((trade) => {
      const d = new Date(trade.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!grouped[key]) {
        grouped[key] = { date: key, trades: [], totalR: 0, totalDollarPnl: 0, tradeCount: 0 };
      }

      grouped[key].trades.push(trade);
      grouped[key].totalR += trade.profitR;
      grouped[key].totalDollarPnl +=
        trade.result === 'TP'
          ? trade.riskDollar * trade.profitR
          : trade.result === 'SL'
          ? -trade.riskDollar
          : 0;
      grouped[key].tradeCount++;
    });

    // Round totals
    Object.values(grouped).forEach((d) => {
      d.totalR        = parseFloat(d.totalR.toFixed(2));
      d.totalDollarPnl = parseFloat(d.totalDollarPnl.toFixed(2));
    });

    res.json({ success: true, data: { month: m, year: y, days: grouped } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
