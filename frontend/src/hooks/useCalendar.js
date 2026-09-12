import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLiveMode, DUMMY_CALENDAR_DAYS } from '../context/LiveModeContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1';

export function useCalendar() {
  const { isLiveMode } = useLiveMode() || { isLiveMode: false };
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState(isLiveMode ? {} : DUMMY_CALENDAR_DAYS);
  const [loading, setLoading] = useState(isLiveMode);
  const [error, setError] = useState(null);

  const fetchCalendar = useCallback(async () => {
    if (!isLiveMode) {
      setDays(DUMMY_CALENDAR_DAYS);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/calendar`, { params: { month, year } });
      setDays(res.data.data.days || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [isLiveMode, month, year]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  return { days, month, year, loading, error, nextMonth, prevMonth, refetch: fetchCalendar };
}
