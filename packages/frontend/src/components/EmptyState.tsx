import styles from './EmptyState.module.css';

/**
 * Displayed when the todo list has no items.
 * Friendly tone with a clipboard emoji, encouraging the user
 * to create their first todo.
 */
export function EmptyState() {
  return (
    <div className={styles.container} role="status">
      <span className={styles.icon} aria-hidden="true">
        {/* Clipboard emoji as a lightweight illustration */}
        &#x1F4CB;
      </span>
      <h2 className={styles.heading}>No todos yet</h2>
      <p className={styles.description}>
        Add your first todo above to get started.
      </p>
    </div>
  );
}
