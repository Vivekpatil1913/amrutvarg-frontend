import { useState, useEffect, useCallback } from "react";

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
import { api, buildQuery } from "../api/client.js";

export function useList(endpoint, params = {}, deps = []) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsStr = JSON.stringify(params);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery(params);
      const res = await api.get(`${endpoint}${qs}`);
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, pageSize: 25, totalPages: 1 });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, paramsStr, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

export function useItem(endpoint, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`${endpoint}/${id}`);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
