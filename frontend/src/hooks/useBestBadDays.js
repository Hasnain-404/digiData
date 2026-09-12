import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLiveMode, DUMMY_BEST_BAD_DAYS } from '../context/LiveModeContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1';

export function useBestBadDays() {
  const { isLiveMode } = useLiveMode() || { isLiveMode: false };
  const [data, setData] = useState(isLiveMode ? { bestDays: [], badDays: [] } : DUMMY_BEST_BAD_DAYS);
  const [loading, setLoading] = useState(isLiveMode);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isLiveMode) {
      setData(DUMMY_BEST_BAD_DAYS);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/analytics/best-bad-days`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load best/bad days');
    } finally {
      setLoading(false);
    }
  }, [isLiveMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
