import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLiveMode, DUMMY_KPIS } from '../context/LiveModeContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

export function useKpis() {
  const { isLiveMode } = useLiveMode() || { isLiveMode: false };
  const [data, setData] = useState(isLiveMode ? null : DUMMY_KPIS);
  const [loading, setLoading] = useState(isLiveMode);
  const [error, setError] = useState(null);

  const fetchKpis = useCallback(async () => {
    if (!isLiveMode) {
      setData(DUMMY_KPIS);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/analytics/kpis`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, [isLiveMode]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  return { data, loading, error, refetch: fetchKpis };
}
