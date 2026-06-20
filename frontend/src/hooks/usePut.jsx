import { useState, useCallback } from 'react';
import API from '../api';

export function usePut(url) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const put = useCallback(async (id, body) => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.put(`${url}${id}/`, body);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { put, loading, error };
}

export function usePatch(url) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const patch = useCallback(async (id, body) => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.patch(`${url}${id}/`, body);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { patch, loading, error };
}
