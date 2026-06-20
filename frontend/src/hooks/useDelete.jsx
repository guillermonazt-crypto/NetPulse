import { useState, useCallback } from 'react';
import API from '../api';

export function useDelete(url) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await API.delete(`${url}${id}/`);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { remove, loading, error };
}
