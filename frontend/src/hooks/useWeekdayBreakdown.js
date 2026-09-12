import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLiveMode, DUMMY_WEEKDAY_BREAKDOWN } from '../context/LiveModeContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1';

export function useWeekdayBreakdown() {
  const { isLiveMode } = useLiveMode() || { isLiveMode: false };
  const [data, setData] = useState(isLiveMode ? [] : DUMMY_WEEKDAY_BREAKDOWN);
  const [loading, setLoading] = useState(isLiveMode);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isLiveMode) {
      setData(DUMMY_WEEKDAY_BREAKDOWN);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/analytics/weekday-breakdown`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load weekday breakdown');
    } finally {
      setLoading(false);
    }
  }, [isLiveMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
