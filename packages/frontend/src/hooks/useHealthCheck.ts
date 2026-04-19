import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
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
  const setIsBackendDownRef = useRef(setIsBackendDown);
  setIsBackendDownRef.current = setIsBackendDown;

  const { data, isError, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      return await api.get('/health');
    },
    refetchInterval: isBackendDown ? HEALTH_POLL_INTERVAL : false,
    enabled: true,
    retry: false,
    staleTime: HEALTH_POLL_INTERVAL,
  });

  useEffect(() => {
    if (isError) {
      setIsBackendDownRef.current(true);
      wasDown.current = true;
    } else if (data?.status === 'ok' && wasDown.current) {
      setIsBackendDownRef.current(false);
      wasDown.current = false;
    }
  }, [isError, data]);

  const isRecovering = isBackendDown && isFetching;

  return { isBackendDown, isRecovering };
}
