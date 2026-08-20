import { useCallback, useEffect, useState } from "react";
import { api } from "./client";

export function useApi(path, { onUnauthorized } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api(path));
    } catch (err) {
      setError(err.message);
      if (err.status === 401 && onUnauthorized) onUnauthorized();
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
