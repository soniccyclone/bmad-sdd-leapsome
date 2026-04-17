import styles from './LoadingState.module.css';

interface LoadingStateProps {
  /** True when all retries have been exhausted */
  isError: boolean;
  /** Called when the user clicks the retry button after failure */
  onRetry: () => void;
}

/**
 * Loading indicator with retry messaging.
 *
 * - While loading: shows a CSS spinner with "Loading your todos..."
 * - After failure: shows an error icon, "Service unavailable" message,
 *   and a retry button.
 */
export function LoadingState({ isError, onRetry }: LoadingStateProps) {
  if (isError) {
    return (
      <div className={styles.container} role="status" aria-live="polite">
        <div className={styles.errorIcon} aria-hidden="true">
          !
        </div>
        <p className={styles.errorMessage}>
          Service unavailable, please try again later.
        </p>
        <button
          type="button"
          className={styles.retryButton}
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>Loading your todos...</p>
    </div>
  );
}
