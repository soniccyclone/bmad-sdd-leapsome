import { useAppContext } from '../context/AppContext.js';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import styles from './ErrorBanner.module.css';

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
    <div role="alert" className={styles.banner}>
      {isRecovering
        ? 'Reconnecting to server...'
        : 'Our site is experiencing problems. Please try again later.'}
    </div>
  );
}
