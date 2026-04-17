import { useAppContext } from '../context/AppContext.js';
import { useHealthCheck } from '../hooks/useHealthCheck.js';

/**
 * Banner displayed when the backend is unreachable.
 * Polls /health every 30 seconds and auto-dismisses on recovery.
 */
export function ErrorBanner() {
  const { isBackendDown } = useAppContext();
  const { isRecovering } = useHealthCheck();

  if (!isBackendDown) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#fef2f2',
        color: '#7f1d1d',
        border: '1px solid #fca5a5',
        borderRadius: '0.375rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      {isRecovering
        ? 'Reconnecting to server...'
        : 'Our site is experiencing problems. Please try again later.'}
    </div>
  );
}
