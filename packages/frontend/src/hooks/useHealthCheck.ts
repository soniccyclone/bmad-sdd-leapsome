import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { client } from '@todo/api-spec/client';
import { useAppContext } from '../context/AppContext.js';

const HEALTH_POLL_INTERVAL = 30_000; // 30 seconds

interface UseHealthCheckResult {
  /** True when the backend is unreachable */
  isBackendDown: boolean;
  /** True when previously down and currently polling for recovery */
  isRecovering: boolean;
}

/**
 * Polls /health every 30 seconds while the banner is visible.
 * Auto-dismisses when health returns ok.
 */
export function useHealthCheck(): UseHealthCheckResult {
  const { isBackendDown, setIsBackendDown } = useAppContext();
  const wasDown = useRef(false);
  // F15: Store setter in a ref so the effect doesn't depend on it
  const setIsBackendDownRef = useRef(setIsBackendDown);
  setIsBackendDownRef.current = setIsBackendDown;

  const { data, isError, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await client.GET('/health');
      if (error || !data) {
        throw new Error('Health check failed');
      }
      return data;
    },
    // Only poll when the backend is down
    refetchInterval: isBackendDown ? HEALTH_POLL_INTERVAL : false,
    // When backend is up, don't refetch automatically
    enabled: true,
    retry: false,
    staleTime: HEALTH_POLL_INTERVAL,
  });

  useEffect(() => {
    if (isError) {
      setIsBackendDownRef.current(true);
      wasDown.current = true;
    } else if (data?.status === 'ok' && wasDown.current) {
      // Backend recovered
      setIsBackendDownRef.current(false);
      wasDown.current = false;
    }
  }, [isError, data]);

  const isRecovering = isBackendDown && isFetching;

  return { isBackendDown, isRecovering };
}
