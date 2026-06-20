import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api';

export function useGet(url, { params, enabled = true, pollInterval } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const paramsKey = JSON.stringify(params);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await API.get(url, { params });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, paramsKey, enabled]);

  useEffect(() => {
    setLoading(true);
    fetch();
    if (pollInterval) {
      intervalRef.current = setInterval(fetch, pollInterval);
    }
    return () => clearInterval(intervalRef.current);
  }, [fetch, pollInterval]);

  return { data, loading, error, refetch: fetch };
}
