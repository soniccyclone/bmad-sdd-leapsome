import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { AppContextProvider } from './context/AppContext.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContextProvider>
          {/* Assertive region for error announcements */}
          <div aria-live="assertive" aria-atomic="true">
            <ErrorBanner />
          </div>

          {/* Main content area */}
          <main>
            <h1>Todo App</h1>
            <p>Components coming in subsequent stories.</p>
          </main>

          {/* Polite region for pagination announcements */}
          <div aria-live="polite" aria-atomic="true" id="pagination-announcer" />
        </AppContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
