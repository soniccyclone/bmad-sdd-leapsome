import * as Select from '@radix-ui/react-select';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 20, 30, 40, 50];

export function Pagination({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  function handlePageClick(newPage: number) {
    onPageChange(newPage);
    // Announce page change to screen readers
    const announcer = document.getElementById('pagination-announcer');
    if (announcer) {
      announcer.textContent = `Page ${newPage} of ${totalPages}`;
    }
  }

  function handleLimitChange(value: string) {
    onLimitChange(Number(value));
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.container} aria-label="Pagination">
      <div className={styles.pages}>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.pageButton} ${p === page ? styles.activePage : ''}`}
            onClick={() => handlePageClick(p)}
            aria-label={`Go to page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
      </div>

      <div className={styles.limitSelect}>
        <span className={styles.limitLabel} id="limit-label">
          Per page:
        </span>
        <Select.Root
          value={String(limit)}
          onValueChange={handleLimitChange}
        >
          <Select.Trigger
            className={styles.selectTrigger}
            aria-labelledby="limit-label"
          >
            <Select.Value />
            <Select.Icon>&#9662;</Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content className={styles.selectContent} position="popper" sideOffset={4}>
              <Select.Viewport className={styles.selectViewport}>
                {LIMIT_OPTIONS.map((opt) => (
                  <Select.Item
                    key={opt}
                    value={String(opt)}
                    className={styles.selectItem}
                  >
                    <Select.ItemText>{opt}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </nav>
  );
}
