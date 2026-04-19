import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useHealthCheck } from './useHealthCheck.js';
import { AppContextProvider } from '../context/AppContext.js';

// Mock the API client
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AppContextProvider, null, children),
    );
  };
}

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isBackendDown=false and isRecovering=false initially', async () => {
    const { api } = await import('../lib/api.js');
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
    });

    const { result } = renderHook(() => useHealthCheck(), {
      wrapper: createWrapper(),
    });

    // Initially the hook should not show backend down
    expect(result.current.isBackendDown).toBe(false);
    expect(result.current.isRecovering).toBe(false);
  });

  it('sets isBackendDown=true when health check fails', async () => {
    const { api } = await import('../lib/api.js');
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useHealthCheck(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isBackendDown).toBe(true);
    });
  });
});
