import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLiveMode, DUMMY_TRADES } from '../context/LiveModeContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1';

export function useTrades() {
  const { isLiveMode } = useLiveMode() || { isLiveMode: false };
  const [trades, setTrades] = useState(isLiveMode ? [] : DUMMY_TRADES);
  const [pagination, setPagination] = useState(
    isLiveMode
      ? { total: 0, page: 1, totalPages: 1 }
      : { total: DUMMY_TRADES.length, page: 1, totalPages: 1 }
  );
  const [loading, setLoading] = useState(isLiveMode);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ session: '', result: '' });
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  const fetchTrades = useCallback(async () => {
    if (!isLiveMode) {
      let filtered = [...DUMMY_TRADES];
      if (filters.session) {
        filtered = filtered.filter((t) => t.session === filters.session);
      }
      if (filters.result) {
        filtered = filtered.filter((t) => t.result === filters.result);
      }
      setTrades(filtered);
      setPagination({ total: filtered.length, page: 1, totalPages: 1 });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit, sortBy, order };
      if (filters.session) params.session = filters.session;
      if (filters.result) params.result = filters.result;
      const res = await axios.get(`${API_BASE}/trades`, { params });
      setTrades(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [isLiveMode, page, limit, filters, sortBy, order]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  // Create a new trade
  const createTrade = async (tradeData) => {
    if (!isLiveMode) {
      const newT = {
        _id: 'd_' + Date.now(),
        date: tradeData.date || new Date().toISOString(),
        pair: tradeData.pair || 'EURUSD',
        type: tradeData.type || 'LONG',
        session: tradeData.session || 'New York',
        riskDollar: parseFloat(tradeData.riskDollar) || 100,
        profitR: parseFloat(tradeData.profitR) || 2,
        accountBalance: parseFloat(tradeData.accountBalance) || 9500,
        result: tradeData.result || 'TP',
        notes: tradeData.notes || '',
      };
      setTrades((prev) => [newT, ...prev]);
      return { success: true, data: newT };
    }
    try {
      setCreating(true);
      const res = await axios.post(`${API_BASE}/trades`, tradeData);
      await fetchTrades(); // refresh list
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create trade' };
    } finally {
      setCreating(false);
    }
  };

  // Delete a trade
  const deleteTrade = async (id) => {
    if (!isLiveMode) {
      setTrades((prev) => prev.filter((t) => t._id !== id));
      return { success: true };
    }
    try {
      const res = await axios.delete(`${API_BASE}/trades/${id}`);
      await fetchTrades();
      return { success: true, data: res.data.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to delete trade',
      };
    }
  };

  const toggleSort = (column) => {
    if (sortBy === column) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(column); setOrder('desc'); }
    setPage(1);
  };

  return {
    trades, pagination, loading, creating, error,
    page, setPage, filters, setFilters,
    sortBy, order, toggleSort,
    createTrade, deleteTrade, refetch: fetchTrades,
  };
}
