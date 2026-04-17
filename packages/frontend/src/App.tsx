import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { TodoForm } from './components/TodoForm.js';
import { TodoList } from './components/TodoList.js';
import { Pagination } from './components/Pagination.js';
import { AppContextProvider } from './context/AppContext.js';
import { useTodos } from './hooks/useTodos.js';
import './styles/tokens.module.css';

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
  const { data, isLoading, isError } = useTodos(page, limit);

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  return (
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

      {isLoading && (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            padding: 'var(--space-8) 0',
          }}
          aria-live="polite"
        >
          Loading todos...
        </p>
      )}

      {isError && !isLoading && (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-error-text)',
            background: 'var(--color-error-bg)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-error-border)',
          }}
          role="alert"
        >
          Failed to load todos. Please try again later.
        </p>
      )}

      {data && !isLoading && (
        <>
          <TodoList todos={data.data} total={data.pagination.total} />

          <div style={{ marginTop: 'var(--space-6)' }}>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        </>
      )}
    </main>
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

          {/* Polite region for pagination announcements */}
          <div aria-live="polite" aria-atomic="true" id="pagination-announcer" />
        </AppContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
