import { useCallback, useEffect, useRef, useState } from 'react';

type UseResourceLoadOptions<T> = {
  initialData: T;
  enabled?: boolean;
};

/**
 * Loads async screen data when `enabled` / `reload` changes — avoids mount-only `useEffect([], [])`.
 */
export function useResourceLoad<T>(
  loader: () => Promise<T>,
  options: UseResourceLoadOptions<T>
): { data: T; loading: boolean; reload: () => void } {
  const { initialData, enabled = true } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [reloadToken, setReloadToken] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        /* screens may ignore errors and keep initialData */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  return { data, loading, reload };
}
