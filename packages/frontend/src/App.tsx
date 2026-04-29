import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { LoadingState } from './components/LoadingState.js';
import { TodoForm } from './components/TodoForm.js';
import { TodoList } from './components/TodoList.js';
import { Pagination } from './components/Pagination.js';
import { AppContextProvider } from './context/AppContext.js';
import { useTodos } from './hooks/useTodos.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function TodoApp() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pageAnnouncement, setPageAnnouncement] = useState('');
  const { data, isLoading, isError } = useTodos(page, limit);
  const qc = useQueryClient();

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
    setPageAnnouncement('');
  }

  function handleRetry() {
    qc.invalidateQueries({ queryKey: ['todos'] });
  }

  function handlePageAnnounce(message: string) {
    setPageAnnouncement(message);
  }

  // Fix 6: Auto-navigate to previous page when last item on current page is deleted
  useEffect(() => {
    if (data && data.data.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [data, page]);

  return (
    <>
      <main
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: 'var(--space-6) var(--space-4)',
          fontFamily: 'var(--font-family)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Todo App
        </h1>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <TodoForm page={page} limit={limit} />
        </div>

        {(isLoading || (isError && !isLoading)) && (
          <LoadingState isError={isError && !isLoading} onRetry={handleRetry} />
        )}

        {data && !isLoading && (
          <>
            <TodoList todos={data.data} total={data.pagination.total} isLoading={isLoading} />

            {data.pagination.total > 10 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  limit={limit}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  onPageAnnounce={handlePageAnnounce}
                />
              </div>
            )}
          </>
        )}
      </main>

      <div aria-live="polite" aria-atomic="true" id="pagination-announcer">
        {pageAnnouncement}
      </div>
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContextProvider>
          {/* Assertive region for error announcements */}
          <div aria-live="assertive" aria-atomic="true">
            <ErrorBanner />
          </div>

          <TodoApp />
        </AppContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
