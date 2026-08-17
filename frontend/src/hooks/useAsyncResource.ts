import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { errorMessage } from '../utils/errors';

export interface AsyncResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

interface AsyncResourceOptions<T> {
  active?: boolean;
  fallbackError: string;
  loader: () => Promise<T>;
  pollInterval?: number | ((data: T | null) => number | null);
}

export function useAsyncResource<T>({
  active = true,
  fallbackError,
  loader,
  pollInterval,
}: AsyncResourceOptions<T>) {
  const [state, setState] = useState<AsyncResourceState<T>>({
    data: null,
    error: null,
    loading: active,
    refreshing: false,
  });
  const requested = useRef(false);
  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    (refreshing = false): Promise<void> => {
      if (inFlight.current) {
        return inFlight.current;
      }

      if (mounted.current) {
        setState((current) => ({
          ...current,
          error: null,
          loading: current.data === null,
          refreshing,
        }));
      }

      let request: Promise<void>;

      request = loader()
        .then((data) => {
          if (mounted.current) {
            setState({ data, error: null, loading: false, refreshing: false });
          }
        })
        .catch((error: unknown) => {
          if (mounted.current) {
            setState((current) => ({
              ...current,
              error: errorMessage(error, fallbackError),
              loading: false,
              refreshing: false,
            }));
          }
        })
        .finally(() => {
          if (inFlight.current === request) {
            inFlight.current = null;
          }
        });

      inFlight.current = request;
      return request;
    },
    [fallbackError, loader],
  );

  useEffect(() => {
    if (!active) {
      requested.current = false;
      return;
    }

    if (requested.current) {
      return;
    }

    requested.current = true;
    void load();
  }, [active, load]);

  const interval =
    typeof pollInterval === 'function' ? pollInterval(state.data) : pollInterval;

  useEffect(() => {
    if (!active || interval == null || interval <= 0) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clearTimer();

      if (!cancelled && document.visibilityState !== 'hidden') {
        timer = window.setTimeout(() => {
          timer = null;
          void load(false).finally(schedule);
        }, interval);
      }
    };

    const handleVisibilityChange = () => {
      clearTimer();

      if (!cancelled && document.visibilityState !== 'hidden') {
        void load(false).finally(schedule);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule();

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active, interval, load]);

  const refresh = useCallback(() => load(true), [load]);
  const replaceData = useCallback((data: T) => {
    if (!mounted.current) {
      return;
    }

    setState((current) => ({
      ...current,
      data,
      error: null,
      loading: false,
      refreshing: false,
    }));
  }, []);

  return {
    ...state,
    refresh,
    replaceData,
  };
}
