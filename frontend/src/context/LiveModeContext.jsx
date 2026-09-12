import React, { createContext, useContext, useState, useEffect } from 'react';

const LiveModeContext = createContext();

export const DUMMY_KPIS = {
  totalR: 42.50,
  winRate: 64.3,
  totalTrades: 84,
  totalWins: 54,
  totalLosses: 30,
  totalDollarGain: 4250.00,
  startingBalance: 5000.00,
  currentBalance: 9250.00,
  maxDrawdownPercent: 4.8,
  maxWinStreak: 8,
  maxLossStreak: 3,
};

export const DUMMY_TRADES = [
  { _id: 'd1', date: '2026-08-28T14:30:00.000Z', pair: 'EURUSD', type: 'LONG', session: 'New York', riskDollar: 100, profitR: 2.5, accountBalance: 9250, result: 'TP', notes: 'ICT Silver Bullet M5 FVG tap + Liquidity sweep' },
  { _id: 'd2', date: '2026-08-27T09:15:00.000Z', pair: 'GBPUSD', type: 'SHORT', session: 'London', riskDollar: 100, profitR: 2.0, accountBalance: 9000, result: 'TP', notes: 'Asia high sweep + CHoCH' },
  { _id: 'd3', date: '2026-08-26T15:00:00.000Z', pair: 'NQ1!', type: 'LONG', session: 'New York', riskDollar: 100, profitR: -1.0, accountBalance: 8800, result: 'SL', notes: 'Stop hunt before expansion' },
  { _id: 'd4', date: '2026-08-25T10:00:00.000Z', pair: 'EURUSD', type: 'SHORT', session: 'London', riskDollar: 100, profitR: 3.0, accountBalance: 8900, result: 'TP', notes: 'HTF Daily Order Block mitigation' },
  { _id: 'd5', date: '2026-08-24T13:45:00.000Z', pair: 'XAUUSD', type: 'LONG', session: 'New York', riskDollar: 100, profitR: 1.8, accountBalance: 8600, result: 'TP', notes: 'Discount FVG bounce' },
  { _id: 'd6', date: '2026-08-21T08:30:00.000Z', pair: 'GBPUSD', type: 'SHORT', session: 'London', riskDollar: 100, profitR: -1.0, accountBalance: 8420, result: 'SL', notes: 'Premature entry before news' },
  { _id: 'd7', date: '2026-08-20T14:00:00.000Z', pair: 'EURUSD', type: 'LONG', session: 'New York', riskDollar: 100, profitR: 2.2, accountBalance: 8520, result: 'TP', notes: 'M15 Order block tap' },
  { _id: 'd8', date: '2026-08-19T09:30:00.000Z', pair: 'NQ1!', type: 'SHORT', session: 'London', riskDollar: 100, profitR: 4.0, accountBalance: 8300, result: 'TP', notes: 'Premium array sell-side liquidity run' },
  { _id: 'd9', date: '2026-08-18T10:15:00.000Z', pair: 'USDJPY', type: 'LONG', session: 'Asia', riskDollar: 100, profitR: -1.0, accountBalance: 7900, result: 'SL', notes: 'Chop consolidation' },
  { _id: 'd10', date: '2026-08-17T14:15:00.000Z', pair: 'EURUSD', type: 'LONG', session: 'New York', riskDollar: 100, profitR: 2.5, accountBalance: 8000, result: 'TP', notes: 'Lunch hour reversal setup' },
  { _id: 'd11', date: '2026-08-14T09:00:00.000Z', pair: 'GBPUSD', type: 'SHORT', session: 'London', riskDollar: 100, profitR: 2.0, accountBalance: 7750, result: 'TP', notes: 'BoS + FVG entry' },
  { _id: 'd12', date: '2026-08-13T13:30:00.000Z', pair: 'NQ1!', type: 'LONG', session: 'New York', riskDollar: 100, profitR: 3.5, accountBalance: 7550, result: 'TP', notes: 'NY open liquidity grab' },
];

export const DUMMY_CALENDAR_DAYS = {
  "2026-08-03": { totalR: 2.0, totalDollarPnl: 200, tradeCount: 2 },
  "2026-08-04": { totalR: 3.0, totalDollarPnl: 300, tradeCount: 1 },
  "2026-08-05": { totalR: -1.0, totalDollarPnl: -100, tradeCount: 1 },
  "2026-08-06": { totalR: 2.5, totalDollarPnl: 250, tradeCount: 2 },
  "2026-08-07": { totalR: 1.5, totalDollarPnl: 150, tradeCount: 1 },
  "2026-08-10": { totalR: -1.0, totalDollarPnl: -100, tradeCount: 1 },
  "2026-08-11": { totalR: 4.0, totalDollarPnl: 400, tradeCount: 2 },
  "2026-08-12": { totalR: 2.0, totalDollarPnl: 200, tradeCount: 1 },
  "2026-08-13": { totalR: 3.5, totalDollarPnl: 350, tradeCount: 2 },
  "2026-08-14": { totalR: 2.0, totalDollarPnl: 200, tradeCount: 1 },
  "2026-08-17": { totalR: 2.5, totalDollarPnl: 250, tradeCount: 1 },
  "2026-08-18": { totalR: -1.0, totalDollarPnl: -100, tradeCount: 1 },
  "2026-08-19": { totalR: 4.0, totalDollarPnl: 400, tradeCount: 2 },
  "2026-08-20": { totalR: 2.2, totalDollarPnl: 220, tradeCount: 1 },
  "2026-08-21": { totalR: -1.0, totalDollarPnl: -100, tradeCount: 1 },
  "2026-08-24": { totalR: 1.8, totalDollarPnl: 180, tradeCount: 1 },
  "2026-08-25": { totalR: 3.0, totalDollarPnl: 300, tradeCount: 1 },
  "2026-08-26": { totalR: -1.0, totalDollarPnl: -100, tradeCount: 1 },
  "2026-08-27": { totalR: 2.0, totalDollarPnl: 200, tradeCount: 1 },
  "2026-08-28": { totalR: 2.5, totalDollarPnl: 250, tradeCount: 1 },
};

export const DUMMY_BEST_BAD_DAYS = {
  bestDays: [
    { day: 'Thursday', totalR: 12.5, totalTrades: 18, wins: 14, winRate: 77.8 },
    { day: 'Tuesday', totalR: 10.2, totalTrades: 20, wins: 15, winRate: 75.0 },
  ],
  badDays: [
    { day: 'Monday', totalR: 2.1, totalTrades: 12, wins: 6, winRate: 50.0 },
    { day: 'Wednesday', totalR: -3.5, totalTrades: 16, wins: 7, winRate: 43.8 },
  ],
};

export const DUMMY_WEEKDAY_BREAKDOWN = [
  { day: 'Monday', totalTrades: 14, wins: 8, losses: 5, be: 1, winRate: 57.1, totalR: 4.5 },
  { day: 'Tuesday', totalTrades: 20, wins: 15, losses: 4, be: 1, winRate: 75.0, totalR: 12.2 },
  { day: 'Wednesday', totalTrades: 16, wins: 7, losses: 8, be: 1, winRate: 43.8, totalR: -2.5 },
  { day: 'Thursday', totalTrades: 18, wins: 14, losses: 3, be: 1, winRate: 77.8, totalR: 15.8 },
  { day: 'Friday', totalTrades: 16, wins: 10, losses: 5, be: 1, winRate: 62.5, totalR: 8.5 },
];

export const DUMMY_MONTHLY_RETURNS = [
  {
    year: 2026,
    months: [
      { month: 'Jan', pct: 8.4, amount: 420, trades: 14 },
      { month: 'Feb', pct: 12.5, amount: 625, trades: 18 },
      { month: 'Mar', pct: -3.2, amount: -160, trades: 12 },
      { month: 'Apr', pct: 15.8, amount: 790, trades: 21 },
      { month: 'May', pct: 9.2, amount: 460, trades: 15 },
      { month: 'Jun', pct: -2.1, amount: -105, trades: 11 },
      { month: 'Jul', pct: 11.4, amount: 570, trades: 17 },
      { month: 'Aug', pct: 13.0, amount: 650, trades: 16 },
      { month: 'Sep', pct: 0, amount: 0, trades: 0 },
      { month: 'Oct', pct: 0, amount: 0, trades: 0 },
      { month: 'Nov', pct: 0, amount: 0, trades: 0 },
      { month: 'Dec', pct: 0, amount: 0, trades: 0 },
    ],
    ytdPct: 65.0,
    ytdAmount: 3250,
    ytdTrades: 124,
  },
];

export const LiveModeProvider = ({ children }) => {
  const [isLiveMode, setIsLiveMode] = useState(() => {
    return localStorage.getItem('isLiveMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isLiveMode', isLiveMode);
  }, [isLiveMode]);

  const toggleLiveMode = () => setIsLiveMode((prev) => !prev);

  return (
    <LiveModeContext.Provider value={{ isLiveMode, setIsLiveMode, toggleLiveMode }}>
      {children}
    </LiveModeContext.Provider>
  );
};

export const useLiveMode = () => useContext(LiveModeContext);
