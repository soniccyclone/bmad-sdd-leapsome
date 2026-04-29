import * as Select from '@radix-ui/react-select';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onPageAnnounce?: (message: string) => void;
}

const LIMIT_OPTIONS = [10, 20, 30, 40, 50];

/**
 * Compute the page numbers to display with ellipsis truncation.
 * Shows: first page, last page, current page +/- 1, with ellipsis for gaps.
 * E.g., for page 5 of 20: [1, '...', 4, 5, 6, '...', 20]
 */
function getVisiblePages(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(page);
  if (page - 1 >= 1) pages.add(page - 1);
  if (page + 1 <= totalPages) pages.add(page + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
}

export function Pagination({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
  onPageAnnounce,
}: PaginationProps) {
  function handlePageClick(newPage: number) {
    if (newPage === page) return;
    onPageChange(newPage);
    // Announce page change to screen readers via callback
    onPageAnnounce?.(`Page ${newPage} of ${totalPages}`);
  }

  function handleLimitChange(value: string) {
    onLimitChange(Number(value));
  }

  const showPageButtons = totalPages > 1;
  const visiblePages = showPageButtons ? getVisiblePages(page, totalPages) : [];

  return (
    <nav className={styles.container} aria-label="Pagination">
      {showPageButtons && (
        <div className={styles.pages}>
          {visiblePages.map((p, index) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">
                &hellip;
              </span>
            ) : (
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
            ),
          )}
        </div>
      )}

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
