import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useTodos, todosQueryKey } from './useTodos.js';

// Mock the API client
vi.mock('@todo/api-spec/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns todo data on success', async () => {
    const mockResponse = {
      data: [
        {
          id: 'todo-1',
          description: 'Test todo',
          completed: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    const { client } = await import('@todo/api-spec/client');
    (client.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockResponse,
      error: undefined,
    });

    const { result } = renderHook(() => useTodos(1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.isError).toBe(false);
  });

  it('returns error state on failure', async () => {
    const { client } = await import('@todo/api-spec/client');
    (client.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: undefined,
      error: { error: { message: 'Server error' } },
    });

    const { result } = renderHook(() => useTodos(1, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });
});

describe('todosQueryKey', () => {
  it('returns correct query key', () => {
    expect(todosQueryKey(1, 10)).toEqual(['todos', { page: 1, limit: 10 }]);
  });

  it('returns different keys for different page/limit', () => {
    expect(todosQueryKey(2, 20)).toEqual(['todos', { page: 2, limit: 20 }]);
  });
});
