import { useState, useCallback } from 'react';
import API from '../api';

export function usePost(url) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const post = useCallback(async (body) => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.post(url, body);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { post, loading, error };
}
