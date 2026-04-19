import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useDeleteTodo } from './useDeleteTodo.js';

// Mock the API client
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDeleteTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a todo successfully', async () => {
    const { api } = await import('../lib/api.js');
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.delete).toHaveBeenCalledWith('/api/todos/:id', undefined, {
      params: { id: 'todo-1' },
    });
  });

  it('handles error from API', async () => {
    const { api } = await import('../lib/api.js');
    (api.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Not found'),
    );

    const { result } = renderHook(() => useDeleteTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'nonexistent' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});
