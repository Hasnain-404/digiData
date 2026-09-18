import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

export function useTrades() {
  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ session: '', result: '' });
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  const fetchTrades = useCallback(async () => {
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
  }, [page, limit, filters, sortBy, order]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  // Create a new trade
  const createTrade = async (tradeData, customHeaders = {}) => {
    try {
      setCreating(true);
      const pin = localStorage.getItem('digidata_owner_pin') || '';
      const headers = { 'x-admin-pin': pin, ...customHeaders };
      const res = await axios.post(`${API_BASE}/trades`, tradeData, { headers });
      await fetchTrades(); // refresh list
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create trade' };
    } finally {
      setCreating(false);
    }
  };

  // Delete a trade
  const deleteTrade = async (id, customHeaders = {}) => {
    try {
      const pin = localStorage.getItem('digidata_owner_pin') || '';
      const headers = { 'x-admin-pin': pin, ...customHeaders };
      const res = await axios.delete(`${API_BASE}/trades/${id}`, { headers });
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
